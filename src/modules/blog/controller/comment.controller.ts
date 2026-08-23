import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CreateCommentDto } from '../dto/comment.dto';
import { BlogCommentService } from '../service/comment.service';
import type { Request } from 'express';
import { Pagination } from 'src/common/decorators/pagination.decorator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { SwaggerConsumes } from 'src/common/enums/swagger.consumes.eum';

@Controller('blog-comment')
@ApiTags('Blog')
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard)
export class BlogCommentController {
  constructor(private readonly blogCommentService: BlogCommentService) {}

  @Post('/')
  @ApiConsumes(SwaggerConsumes.UrlEncoded, SwaggerConsumes.Json)
  create(@Body() commentDto: CreateCommentDto, @Req() req: Request) {
    return this.blogCommentService.create(commentDto, req.user);
  }
  @Get('/')
  @Pagination()
  find(@Query() paginationDto: PaginationDto) {
    return this.blogCommentService.find(paginationDto);
  }
  @Put('/accept/:id')
  accept(@Param('id', ParseIntPipe) id: number) {
    return this.blogCommentService.accept(id);
  }
  @Put('/reject/:id')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.blogCommentService.reject(id);
  }
}
