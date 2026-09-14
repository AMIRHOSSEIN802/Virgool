import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Pagination } from 'src/common/decorators/pagination.decorator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@Controller('notification')
@ApiTags('Notification')
@ApiBearerAuth('Authorization')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // NOTE: '/read-all' is declared BEFORE '/:id/read' so the literal route is
  // not swallowed by the param route.
  @Get('/')
  @Pagination()
  findMine(@Query() paginationDto: PaginationDto, @Req() req: Request) {
    return this.notificationService.findMine(req.user.id, paginationDto);
  }

  @Get('/unread-count')
  unreadCount(@Req() req: Request) {
    return this.notificationService.unreadCount(req.user.id);
  }

  @Patch('/read-all')
  markAllRead(@Req() req: Request) {
    return this.notificationService.markAllRead(req.user.id);
  }

  @Patch('/:id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.notificationService.markRead(req.user.id, id);
  }
}
