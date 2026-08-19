import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from '../entities/blog.entity';
import { Repository } from 'typeorm';
import { CreateCommentDto } from '../dto/comment.dto';
import { BlogService } from './blog.service';
import { BlogCommenrtEntity } from '../entities/comment.entity';
import { PublicMessage } from 'src/common/enums/message.enum';
import { UserEntity } from 'src/modules/user/entities/user.entity';

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
}
