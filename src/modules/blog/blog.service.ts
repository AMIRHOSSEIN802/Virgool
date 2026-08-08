import { Inject, Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from './entities/blog.entity';
import { Repository } from 'typeorm';
import { CreateBlogDto } from './dto/blog.dto';
import { createSlug, randomId } from 'src/common/utils/functions.util';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { BlogStatus } from './enums/status.enum';
import { PublicMessage } from 'src/common/enums/message.enum';

@Injectable({ scope: Scope.REQUEST })
export class BlogService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(blogDto: CreateBlogDto) {
    const user = this.request.user;

    const { title, content, description, image, time_for_study } = blogDto;

    const slugData = blogDto.slug?.trim() || title;

    const baseSlug = createSlug(slugData);

    const isExist = await this.checkBlogBySlug(baseSlug);

    const slug = isExist ? `${baseSlug}-${randomId()}` : baseSlug;
    const blog = this.blogRepository.create({
      title,
      slug,
      description,
      content,
      image,
      status: BlogStatus.Draft,
      time_for_study,
      authorId: user.id,
    });
    await this.blogRepository.save(blog);
    return {
      message: PublicMessage.Created,
    };
  }
  async checkBlogBySlug(slug: string) {
    const blog = await this.blogRepository.findOneBy({ slug });
    return !!blog;
  }
}
