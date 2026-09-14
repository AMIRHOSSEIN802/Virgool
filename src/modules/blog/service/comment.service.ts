import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
  forwardRef,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from '../entities/blog.entity';
import { IsNull, Repository } from 'typeorm';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { BlogService } from './blog.service';
import { BlogCommenrtEntity } from '../entities/comment.entity';
import {
  BadRequestMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';
import { ForbiddenMessage } from 'src/common/enums/message.enum';
import { Roles } from 'src/common/enums/role.eunm';

@Injectable()
export class BlogCommentService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,

    @InjectRepository(BlogCommenrtEntity)
    private blogCommentRepository: Repository<BlogCommenrtEntity>,

    @Inject(forwardRef(() => BlogService))
    @Inject(forwardRef(() => BlogService))
    private blogService: BlogService,
  ) {}

  async create(commentDto: CreateCommentDto, user: UserEntity) {
    const { parentId, text, blogId } = commentDto;
    const { id: userId } = user;

    await this.blogService.checkExistBlogById(Number(blogId));

    let parent: BlogCommenrtEntity | null = null;

    if (parentId && Number(parentId) > 0) {
      parent = await this.blogCommentRepository.findOneBy({
        id: Number(parentId),
      });
    }

    await this.blogCommentRepository.insert({
      text,
      accepted: true,
      blogId: Number(blogId),
      parentId: parent?.id ?? null,
      userId,
    });

    return {
      message: PublicMessage.CreatedComment,
    };
  }
  async find(paginationDto: PaginationDto, accepted?: string) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    // Admin moderation filter: 'true' → accepted, 'false' → rejected,
    // anything else (unset/invalid) → all comments.
    const where: Record<string, unknown> = {};
    if (accepted === 'true') where.accepted = true;
    else if (accepted === 'false') where.accepted = false;
    const [comments, count] = await this.blogCommentRepository.findAndCount({
      where,
      relations: {
        blog: true,
        user: { profile: true },
      },
      select: {
        blog: {
          title: true,
        },
        user: {
          username: true,
          profile: {
            nick_name: true,
          },
        },
      },

      skip,
      take: limit,
      order: { id: 'DESC' },
    });
    return {
      pagination: paginationGenerator(count, page, limit),
      comments,
    };
  }
  async findCommentsOfBlog(blogId: number, paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const [comments, count] = await this.blogCommentRepository.findAndCount({
      where: {
        blogId,
        parentId: IsNull(),
      },
      relations: {
        user: { profile: true },
        children: {
          user: { profile: true },
          children: {
            user: { profile: true },
          },
        },
      },
      select: {
        user: {
          username: true,
          profile: {
            nick_name: true,
          },
        },
        children: {
          // id + accepted must be selected: the frontend uses child.id as the
          // React list key (omitting it collapses every reply to key={undefined}
          // → "unique key" warnings) and shows the rejected badge from .accepted.
          // userId is selected so the frontend can identify the reply author
          // for edit/delete visibility without trusting anything from the client.
          id: true,
          userId: true,
          accepted: true,
          text: true,
          created_at: true,
          parentId: true,
          user: {
            username: true,
            profile: {
              nick_name: true,
            },
          },
          children: {
            id: true,
            userId: true,
            accepted: true,
            text: true,
            created_at: true,
            parentId: true,
            user: {
              username: true,
              profile: {
                nick_name: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      order: { id: 'DESC' },
    });
    return {
      pagination: paginationGenerator(count, page, limit),
      comments,
    };
  }
  async checkExistCommentById(id: number) {
    const comment = await this.blogCommentRepository.findOneBy({ id });
    // 404-first (consistent with blog resource checks in B1/B3)
    if (!comment) throw new NotFoundException(NotFoundMessage.NotFound);
    return comment;
  }
  /**
   * B7: only the comment author may edit/delete their own comment; Admins may
   * moderate any comment (consistent with the accept/reject policy above).
   * Ownership is derived from the DB record + req.user — never from the body.
   */
  private assertCommentAuthor(comment: BlogCommenrtEntity, user: UserEntity) {
    if (user.role === Roles.Admin) return;
    if (comment.userId === user.id) return;
    throw new ForbiddenException(ForbiddenMessage.AccessDenied);
  }
  async update(id: number, dto: UpdateCommentDto, user: UserEntity) {
    const comment = await this.checkExistCommentById(id);
    this.assertCommentAuthor(comment, user);
    // Whitelist: only text changes. userId/blogId/parentId/accepted cannot be
    // touched here even if a hostile body carries them (they are absent from
    // UpdateCommentDto and ValidationPipe strips unknown properties).
    comment.text = dto.text;
    await this.blogCommentRepository.save(comment);
    return {
      message: PublicMessage.Updated,
      comment: { id: comment.id, text: comment.text, accepted: comment.accepted },
    };
  }
  async remove(id: number, user: UserEntity) {
    const comment = await this.checkExistCommentById(id);
    this.assertCommentAuthor(comment, user);
    // The parentId FK is ON DELETE CASCADE (verified in PostgreSQL), so replies
    // to a deleted comment are removed by the database — the project's own
    // semantics for nested comments. Blog/user FKs are CASCADE as well.
    await this.blogCommentRepository.remove(comment);
    return {
      message: PublicMessage.Deleted,
    };
  }
  async accept(id: number, user: UserEntity) {
    const comment = await this.checkExistCommentById(id);
    await this.assertCommentOwner(comment, user);
    if (comment.accepted)
      throw new BadRequestException(BadRequestMessage.AlreadyAccepted);
    comment.accepted = true;
    await this.blogCommentRepository.save(comment);
    return {
      message: PublicMessage.Updated,
    };
  }
  async reject(id: number, user: UserEntity) {
    const comment = await this.checkExistCommentById(id);
    await this.assertCommentOwner(comment, user);
    if (!comment.accepted)
      throw new BadRequestException(BadRequestMessage.AlreadyRejected);
    comment.accepted = false;
    await this.blogCommentRepository.save(comment);
    return {
      message: PublicMessage.Updated,
    };
  }

  /**
   * Only the author of the commented blog or an Admin may accept/reject.
   * The authenticated user is passed in from the controller (req.user).
   */
  private async assertCommentOwner(
    comment: BlogCommenrtEntity,
    user?: UserEntity,
  ) {
    if (!user) return;
    if (user.role === Roles.Admin) return;
    const blog = await this.blogRepository.findOneBy({ id: comment.blogId });
    if (blog && blog.authorId === user.id) return;
    throw new ForbiddenException(ForbiddenMessage.AccessDenied);
  }
}
