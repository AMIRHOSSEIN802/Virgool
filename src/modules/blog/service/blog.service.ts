import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createSlug, randomId } from 'src/common/utils/functions.util';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  BadRequestMessage,
  ForbiddenMessage,
  NotFoundMessage,
  PublicMessage,
} from 'src/common/enums/message.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';
import { isArray } from 'class-validator';
import { EntityName } from 'src/common/enums/entity.eunm';
import { Roles } from 'src/common/enums/role.eunm';
import { BlogEntity } from '../entities/blog.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { CreateBlogDto, FilterBlogDto, UpdateBlogDto } from '../dto/blog.dto';
import { BlogStatus } from '../enums/status.enum';
import { CategoryService } from 'src/modules/category/category.service';
import { BlogCategoryEntity } from '../entities/blog-category.entity';
import { BlogLikeEntity } from '../entities/like.entity';
import { BlogBookmarkEntity } from '../entities/bookmark.entity';
import { BlogCommentService } from './comment.service';

@Injectable({ scope: Scope.REQUEST })
export class BlogService {
  constructor(
    @InjectRepository(BlogEntity)
    private blogRepository: Repository<BlogEntity>,
    @InjectRepository(BlogCategoryEntity)
    private blogCategoryRepository: Repository<BlogCategoryEntity>,
    @InjectRepository(BlogLikeEntity)
    private blogLikeRepository: Repository<BlogLikeEntity>,
    @InjectRepository(BlogBookmarkEntity)
    private blogbookmarkRepository: Repository<BlogBookmarkEntity>,
    @Inject(REQUEST) private request: Request,
    private categoryService: CategoryService,
    private blogCommentService: BlogCommentService,
    private dataSource: DataSource,
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

    let where = 'blog.status = :status';
    const parameters: Record<string, unknown> = {
      status: BlogStatus.Published,
    };

    if (category) {
      category = category.toLowerCase();
      where += ' AND category.title = LOWER(:category)';
      parameters.category = category;
    }

    if (search) {
      search = `%${search}%`;
      where +=
        ' AND CONCAT(blog.title, blog.description, blog.content) ILIKE :search';
      parameters.search = search;
    }
    const [blogs, count] = await this.blogRepository
      .createQueryBuilder(EntityName.blog)
      .leftJoin('blog.categories', 'blogCategory')
      .leftJoin('blogCategory.category', 'category')
      .leftJoin('blog.author', 'author')
      .leftJoin('author.profile', 'profile')
      .addSelect([
        'blogCategory.id',
        'category.title',
        'author.username',
        'author.id',
        'profile.nick_name',
      ])
      .where(where, parameters)
      .orderBy('blog.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Per-viewer like/bookmark state for the whole page in ONE query each
    // (no N+1). Guest requests get plain false.
    const viewerId = (this.request as Request & { user?: { id: number } }).user
      ?.id;
    let likedIds = new Set<number>();
    let bookmarkedIds = new Set<number>();
    if (viewerId && blogs.length > 0) {
      const blogIds = blogs.map((b) => b.id);
      const [likes, bookmarks] = await Promise.all([
        this.blogLikeRepository
          .createQueryBuilder('like')
          .where('like.userId = :viewerId', { viewerId })
          .andWhere('like.blogId IN (:...blogIds)', { blogIds })
          .getMany(),
        this.blogbookmarkRepository
          .createQueryBuilder('bookmark')
          .where('bookmark.userId = :viewerId', { viewerId })
          .andWhere('bookmark.blogId IN (:...blogIds)', { blogIds })
          .getMany(),
      ]);
      likedIds = new Set(likes.map((l) => l.blogId));
      bookmarkedIds = new Set(bookmarks.map((b) => b.blogId));
    }

    return {
      pagination: paginationGenerator(count, page, limit),
      blogs: blogs.map((blog) => ({
        ...blog,
        isLiked: likedIds.has(blog.id),
        isBookmarked: bookmarkedIds.has(blog.id),
      })),
    };
  }
  async checkExistBlogById(id: number) {
    const blog = await this.blogRepository.findOneBy({ id });
    if (!blog) throw new NotFoundException(NotFoundMessage.NotFoundPost);
    return blog;
  }
  /**
   * Only the blog's author or an Admin may modify/delete it (IDOR/BOLA guard).
   * The owner is read from the LOADED blog row — never from client input.
   */
  private assertBlogOwner(blog: BlogEntity) {
    const user = this.request.user as UserEntity | undefined;
    if (!user) return; // AuthGuard guarantees an authenticated user on these routes
    if (user.role === Roles.Admin) return; // admins may moderate any blog
    if (blog.authorId !== user.id) {
      throw new ForbiddenException(ForbiddenMessage.AccessDenied);
    }
  }
  async delete(id: number) {
    const blog = await this.checkExistBlogById(id);
    this.assertBlogOwner(blog);
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
    this.assertBlogOwner(blog);

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
  /**
   * B3 — dedicated publish workflow. Only the owner or an Admin may publish
   * (same semantics as B1's assertBlogOwner). Idempotent: publishing an
   * already-published blog is a successful no-op. All other data is untouched.
   */
  async publish(id: number) {
    const blog = await this.checkExistBlogById(id);
    this.assertBlogOwner(blog);

    if (blog.status !== String(BlogStatus.Published)) {
      blog.status = BlogStatus.Published;
      await this.blogRepository.save(blog);
    }
    return {
      message: PublicMessage.Published,
    };
  }
  async LikeToggle(blogId: number) {
    const { id: userId } = this.request.user;
    await this.checkExistBlogById(blogId);
    const isLiked = await this.blogLikeRepository.findOneBy({ userId, blogId });
    let message = PublicMessage.Liek;
    if (isLiked) {
      await this.blogLikeRepository.delete({ id: isLiked.id });
      message = PublicMessage.DisLike;
    } else {
      await this.blogLikeRepository.insert({
        blogId,
        userId,
      });
    }
    return { message };
  }
  async bookmarkToggle(blogId: number) {
    const { id: userId } = this.request.user;
    await this.checkExistBlogById(blogId);
    const isbookmark = await this.blogbookmarkRepository.findOneBy({
      userId,
      blogId,
    });
    let message = PublicMessage.bokkmark;
    if (isbookmark) {
      await this.blogbookmarkRepository.delete({ id: isbookmark.id });
      message = PublicMessage.Unbookmark;
    } else {
      await this.blogbookmarkRepository.insert({
        blogId,
        userId,
      });
    }
    return { message };
  }
  async findOneBySlug(slug: string, paginationDto: PaginationDto) {
    const user = this.request?.user as UserEntity | undefined;

    const blog = await this.blogRepository
      .createQueryBuilder(EntityName.blog)

      .leftJoin('blog.categories', 'blogCategory')
      .leftJoin('blogCategory.category', 'category')

      .leftJoin('blog.author', 'author')
      .leftJoin('author.profile', 'profile')

      .addSelect([
        'blogCategory.id',
        'category.title',

        'author.username',
        'author.id',

        'profile.nick_name',
      ])

      // گرفتن کامنت‌های بلاگ
      .leftJoinAndSelect('blog.comments', 'comments')

      .where({ slug })

      .andWhere('(comments.id IS NULL OR comments.accepted = :accepted)', {
        accepted: true,
      })

      .getOne();

    if (!blog) {
      throw new NotFoundException(NotFoundMessage.NotFoundPost);
    }

    /**
     * Draft privacy (B2): a non-published blog is only visible to its author
     * or an Admin. Anyone else — including guests — gets a 404 so the draft's
     * existence is never revealed.
     */
    if (blog.status !== String(BlogStatus.Published)) {
      const isOwner = user?.id === blog.authorId;
      const isAdmin = user?.role === Roles.Admin;
      if (!isOwner && !isAdmin) {
        throw new NotFoundException(NotFoundMessage.NotFoundPost);
      }
    }

    // گرفتن کامنت‌های بلاگ
    const commentsData = await this.blogCommentService.findCommentsOfBlog(
      blog.id,
      paginationDto,
    );

    // بررسی Like و Bookmark
    let isLiked = false;
    let isBookmarked = false;

    if (user?.id && !isNaN(user.id) && user.id > 0) {
      isLiked = !!(await this.blogLikeRepository.findOneBy({
        userId: user.id,
        blogId: blog.id,
      }));

      isBookmarked = !!(await this.blogbookmarkRepository.findOneBy({
        userId: user.id,
        blogId: blog.id,
      }));
    }

    // گرفتن 3 مقاله تصادفی پیشنهادی
    type SuggestedBlog = {
      id: number;
      slug: string;
      title: string;
      description: string;
      time_for_study: number;
      image: string | null;
      author: {
        username: string;
        author_name: string | null;
        image: string | null;
      };
      categories: string[];
      likes: number;
      bookmarks: number;
      comments: number;
    };

    const suggestBlogs = await this.dataSource.query<SuggestedBlog[]>(
      `
      SELECT
        blog.id,
        blog.slug,
        blog.title,
        blog.description,
        blog.time_for_study,
        blog.image,

        json_build_object(
          'username', u.username,
          'author_name', p.nick_name,
          'image', p.image_profile
        ) AS author,

        COALESCE(
          array_agg(DISTINCT cat.title)
          FILTER (WHERE cat.id IS NOT NULL),
          '{}'
        ) AS categories,

        (
          SELECT COUNT(*)::int
          FROM blog_like
          WHERE blog_like."blogId" = blog.id
        ) AS likes,

        (
          SELECT COUNT(*)::int
          FROM blog_bookmark
          WHERE blog_bookmark."blogId" = blog.id
        ) AS bookmarks,

        (
          SELECT COUNT(*)::int
          FROM blog_comments
          WHERE blog_comments."blogId" = blog.id
        ) AS comments

      FROM blog

      LEFT JOIN public.user u
        ON blog."authorId" = u.id

      LEFT JOIN profile p
        ON p."userId" = u.id

      LEFT JOIN blog_category bc
        ON blog.id = bc."blogId"

      LEFT JOIN category cat
        ON bc."categoryId" = cat.id

      -- مقاله‌ای که الان کاربر مشاهده می‌کند پیشنهاد نشود
      -- فقط مقالات منتشرشده پیشنهاد می‌شوند (draft خصوصی است)
      WHERE blog.id != $1
        AND blog.status = 'published'

      GROUP BY
        blog.id,
        u.username,
        p.nick_name,
        p.image_profile

      ORDER BY RANDOM()
      LIMIT 3
    `,
      [blog.id],
    );

    return {
      blog,
      isLiked,
      isBookmarked,
      commentsData,
      suggestBlogs,
    };
  }
}
