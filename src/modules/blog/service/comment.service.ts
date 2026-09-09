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
import { CreateCommentDto } from '../dto/comment.dto';
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
  async find(paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const [comments, count] = await this.blogCommentRepository.findAndCount({
      where: {},
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
