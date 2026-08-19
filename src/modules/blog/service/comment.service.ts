import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from '../entities/blog.entity';
import { Repository } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { CreateCommentDto } from '../dto/comment.dto';
import { BlogService } from './blog.service';
import { BlogCommenrtEntity } from '../entities/comment.entity';
import { PublicMessage } from 'src/common/enums/message.enum';
@Injectable({ scope: Scope.REQUEST })
export class BlogCommentService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,
    @InjectRepository(BlogCommenrtEntity)
    private blogCommentRepository: Repository<BlogCommenrtEntity>,
    @Inject(REQUEST) private request: Request,
    @Inject(forwardRef(() => BlogService)) private blogService: BlogService,
  ) {}

  async create(commentDto: CreateCommentDto) {
    const { parentId, text, blogId } = commentDto;
    const { id: userId } = this.request.user;

    await this.blogService.checkExistBlogById(blogId);

    let parent: BlogCommenrtEntity | null = null;

    if (parentId && !isNaN(parentId)) {
      parent = await this.blogCommentRepository.findOneBy({
        id: +parentId,
      });
    }

    await this.blogCommentRepository.insert({
      text,
      accepted: true,
      blogId,
      parentId: parent ? parentId : null,
      userId,
    });

    return {
      message: PublicMessage.CreatedComment,
    };
  }
}
