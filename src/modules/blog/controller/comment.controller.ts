import {
  Body,
  Controller,
  Delete,
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
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';
import { BlogCommentService } from '../service/comment.service';
import type { Request } from 'express';
import { Pagination } from 'src/common/decorators/pagination.decorator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { CanAccess } from 'src/common/decorators/role.dexorator';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from 'src/common/enums/role.eunm';
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
  @CanAccess(Roles.Admin)
  @UseGuards(RoleGuard)
  find(
    @Query() paginationDto: PaginationDto,
    @Query('accepted') accepted?: string,
  ) {
    return this.blogCommentService.find(paginationDto, accepted);
  }
  @Put('/accept/:id')
  accept(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.blogCommentService.accept(id, req.user);
  }
  @Put('/reject/:id')
  reject(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.blogCommentService.reject(id, req.user);
  }
  // B7: author edit/delete. Declared AFTER accept/reject so ':id' does not
  // swallow those literal routes.
  @Put('/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @Req() req: Request,
  ) {
    return this.blogCommentService.update(id, dto, req.user);
  }
  @Delete('/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.blogCommentService.remove(id, req.user);
  }
}
