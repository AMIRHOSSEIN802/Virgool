import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BlogEntity } from './entities/blog.entity';
import { Repository } from 'typeorm';
import { CreateBlogDto, FilterBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { createSlug, randomId } from 'src/common/utils/functions.util';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { BlogStatus } from './enums/status.enum';
import {
  BadRequestMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';
import { isArray } from 'class-validator';
import { CategoryService } from '../category/category.service';
import { BlogCategoryEntity } from './entities/blog-category.entity';
import { EntityName } from 'src/common/enums/entity.eunm';

@Injectable({ scope: Scope.REQUEST })
export class BlogService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,
    @InjectRepository(BlogCategoryEntity)
    private blogCategoryRepository: Repository<BlogCategoryEntity>,
    @Inject(REQUEST) private request: Request,
    private categoryService: CategoryService,
  ) {}

  async create(blogDto: CreateBlogDto) {
    const user = this.request.user;

    const { title, content, description, image, time_for_study, categories } =
      blogDto;

    let categoryList = categories;

    if (typeof categoryList === 'string') {
      categoryList = categoryList
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean);
    } else if (!isArray(categoryList)) {
      throw new BadRequestException(BadRequestMessage.invalidCategorise);
    }

    const baseSlug = createSlug(blogDto.slug?.trim() || title);

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

    for (const categoryTitle of categoryList) {
      let category = await this.categoryService.findOneByTitle(categoryTitle);

      if (!category) {
        category = await this.categoryService.insertByTitle(categoryTitle);
      }

      await this.blogCategoryRepository.insert({
        blogId: blog.id,
        categoryId: category.id,
      });
    }

    return {
      message: PublicMessage.Created,
    };
  }
  async checkBlogBySlug(slug: string) {
    const blog = await this.blogRepository.findOneBy({ slug });
    return blog;
  }
  async myBlog() {
    const { id } = this.request.user;
    return this.blogRepository.find({
      where: {
        authorId: id,
      },
      order: {
        id: 'DESC',
      },
    });
  }
  async blogList(paginationDto: PaginationDto, filterDto: FilterBlogDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);

    let { category, search } = filterDto;

    let where = '';

    if (category) {
      category = category.toLowerCase();
      if (where.length > 0) where += ' AND ';
      where += 'category.title = LOWER(:category)';
    }

    if (search) {
      if (where.length > 0) where += ' AND ';
      search = `%${search}%`;
      where +=
        'CONCAT(blog.title, blog.description, blog.content) ILIKE :search';
    }
    const [blogs, count] = await this.blogRepository
      .createQueryBuilder(EntityName.blog)
      .leftJoin('blog.categories', 'blogCategory')
      .leftJoin('blogCategory.category', 'category')
      .addSelect(['blogCategory.id', 'category.title'])
      .where(where, { category, search })
      .orderBy('blog.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // const [blogs, count] = await this.blogRepository.findAndCount({
    //   where: {},
    //   order: {
    //     id: 'DESC',
    //   },
    //   skip,
    //   take: limit,
    // });
    return {
      pagination: paginationGenerator(count, page, limit),
      blogs,
    };
  }
  async checkExistBlogById(id: number) {
    const blog = await this.blogRepository.findOneBy({ id });
    if (!blog) throw new NotFoundException(NotFoundMessage.NotFoundPost);
    return blog;
  }
  async delete(id: number) {
    await this.checkExistBlogById(id);
    await this.blogRepository.delete({ id });
    return {
      message: PublicMessage.Deleted,
    };
  }
  async update(id: number, blogDto: UpdateBlogDto) {
    const {
      title,
      slug,
      content,
      description,
      image,
      time_for_study,
      categories,
    } = blogDto;

    const blog = await this.checkExistBlogById(id);

    if (title !== undefined) {
      blog.title = title;
    }

    if (description !== undefined) {
      blog.description = description;
    }

    if (content !== undefined) {
      blog.content = content;
    }

    if (image !== undefined) {
      blog.image = image;
    }

    if (time_for_study !== undefined) {
      blog.time_for_study = time_for_study;
    }

    let slugData: string | null = null;

    if (title !== undefined) {
      blog.title = title;
      slugData = title;
    }

    if (slug !== undefined && slug.trim() !== '') {
      slugData = slug;
    }

    if (slugData) {
      let newSlug = createSlug(slugData);

      const isExist = await this.checkBlogBySlug(newSlug);

      if (isExist && isExist.id !== id) {
        newSlug += `-${randomId()}`;
      }

      blog.slug = newSlug;
    }

    await this.blogRepository.save(blog);

    if (categories !== undefined) {
      let categoryList: string[];

      if (typeof categories === 'string') {
        categoryList = categories
          .split(',')
          .map((category) => category.trim())
          .filter(Boolean);
      } else if (isArray(categories)) {
        categoryList = categories
          .map((category) => category.trim())
          .filter(Boolean);
      } else {
        throw new BadRequestException(BadRequestMessage.invalidCategorise);
      }

      await this.blogCategoryRepository.delete({
        blogId: blog.id,
      });

      for (const categoryTitle of categoryList) {
        let category = await this.categoryService.findOneByTitle(categoryTitle);

        if (!category) {
          category = await this.categoryService.insertByTitle(categoryTitle);
        }

        await this.blogCategoryRepository.insert({
          blogId: blog.id,
          categoryId: category.id,
        });
      }
    }

    return {
      message: PublicMessage.Updated,
    };
  }
}
