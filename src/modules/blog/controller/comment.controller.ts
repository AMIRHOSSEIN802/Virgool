import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CreateCommentDto } from '../dto/comment.dto';
import { BlogCommentService } from '../service/comment.service';
import type { Request } from 'express';

@Controller('blog-comment')
@ApiTags('Blog')
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard)
export class BlogCommentController {
  constructor(private readonly blogCommentService: BlogCommentService) {}

  @Post()
  create(@Body() commentDto: CreateCommentDto, @Req() req: Request) {
    return this.blogCommentService.create(commentDto, req.user);
  }
}
