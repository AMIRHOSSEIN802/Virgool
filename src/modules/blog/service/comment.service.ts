import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from '../entities/blog.entity';
import { Repository } from 'typeorm';
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

@Injectable()
export class BlogCommentService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,

    @InjectRepository(BlogCommenrtEntity)
    private blogCommentRepository: Repository<BlogCommenrtEntity>,

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
  async checkExistCommentById(id: number) {
    const comment = await this.blogCommentRepository.findOneBy({ id });
    if (!comment) throw new BadRequestException(NotFoundMessage.NotFound);
    return comment;
  }
  async accept(id: number) {
    const comment = await this.checkExistCommentById(id);
    if (comment.accepted)
      throw new BadRequestException(BadRequestMessage.AlreadyAccepted);
    comment.accepted = true;
    await this.blogCommentRepository.save(comment);
    return {
      message: PublicMessage.Updated,
    };
  }
  async reject(id: number) {
    const comment = await this.checkExistCommentById(id);
    if (!comment.accepted)
      throw new BadRequestException(BadRequestMessage.AlreadyRejected);
    comment.accepted = false;
    await this.blogCommentRepository.save(comment);
    return {
      message: PublicMessage.Updated,
    };
  }
}
