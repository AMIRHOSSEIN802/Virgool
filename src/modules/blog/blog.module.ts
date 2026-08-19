import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogEntity } from './entities/blog.entity';
import { CategoryService } from '../category/category.service';
import { CategoryEntity } from '../category/entities/category.entity';
import { BlogCategoryEntity } from './entities/blog-category.entity';
import { BlogLikeEntity } from './entities/like.entity';
import { BlogBookmarkEntity } from './entities/bookmark.entity';
import { BlogController } from './controller/blog.controller';
import { BlogService } from './service/blog.service';
import { BlogCommenrtEntity } from './entities/comment.entity';
import { BlogCommentController } from './controller/comment.controller';
import { BlogCommentService } from './service/comment.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      BlogEntity,
      CategoryEntity,
      BlogCategoryEntity,
      BlogLikeEntity,
      BlogBookmarkEntity,
      BlogCommenrtEntity,
    ]),
  ],
  controllers: [BlogController, BlogCommentController],
  providers: [BlogService, CategoryService, BlogCommentService],
})
export class BlogModule {}
