import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType } from './enums/type.enum';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {
  paginationGenerator,
  paginationSolver,
} from 'src/common/utils/pagination.util';
import { NotFoundMessage, PublicMessage } from 'src/common/enums/message.enum';

/** Input accepted from a domain service after its business action succeeded. */
export interface PushNotificationInput {
  type: NotificationType;
  /** Who receives it — never taken from the frontend. */
  recipientId: number;
  /** Who caused it (null for system events). */
  actorId?: number | null;
  blogId?: number | null;
  commentId?: number | null;
}

/**
 * Singleton (NOT request-scoped): avoids deepening the BlogService ↔
 * BlogCommentService forwardRef cycle. Every method takes the authenticated
 * userId explicitly — the controller passes req.user.id; nothing here trusts
 * a client-supplied recipient/user id.
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,
  ) {}

  /**
   * Called by domain services AFTER their business action succeeded.
   * Dedup policy (MVP): for repeatable toggles (like/follow) an existing
   * UNREAD notification of the same (recipient, actor, type, blog) is reused
   * instead of stacking copies — unlike/like-again does not spam. Read ones
   * stay as history so a fresh unread is created on a new event.
   * Comment/reply/moderation events always create (distinct actions).
   */
  async push(input: PushNotificationInput) {
    const dedupe =
      input.type === NotificationType.Like ||
      input.type === NotificationType.Follow;
    if (dedupe && input.actorId) {
      const where: Record<string, unknown> = {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        isRead: false,
      };
      if (input.type === NotificationType.Like && input.blogId) {
        where.blogId = input.blogId;
      }
      const existing = await this.notificationRepository.findOne({
        where,
        order: { id: 'DESC' },
      });
      if (existing) return;
    }
    await this.notificationRepository.insert({
      type: input.type,
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      blogId: input.blogId ?? null,
      commentId: input.commentId ?? null,
    });
  }

  /**
   * Own notifications, newest first. Single query with joined actor profile
   * and blog slug (no N+1); only whitelisted columns are selected — no
   * email/phone/password/tokens on the actor rows.
   */
  async findMine(userId: number, paginationDto: PaginationDto) {
    const { limit, page, skip } = paginationSolver(paginationDto);
    const [rows, count] = await this.notificationRepository
      .createQueryBuilder('n')
      .leftJoin('n.actor', 'actor')
      .leftJoin('actor.profile', 'actorProfile')
      .leftJoin('n.blog', 'blog')
      .select([
        'n.id',
        'n.type',
        'n.isRead',
        'n.created_at',
        'n.blogId',
        'n.commentId',
        'n.actorId',
        'actor.id',
        'actor.username',
        'actorProfile.nick_name',
        'actorProfile.image_profile',
        'blog.slug',
      ])
      .where('n.recipientId = :me', { me: userId })
      .orderBy('n.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      pagination: paginationGenerator(count, page, limit),
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        isRead: n.isRead,
        created_at: n.created_at,
        blogSlug: n.blog?.slug ?? null,
        commentId: n.commentId,
        actor: n.actor
          ? {
              id: n.actor.id,
              username: n.actor.username,
              nick_name: n.actor.profile?.nick_name ?? null,
              image_profile: n.actor.profile?.image_profile ?? null,
            }
          : null,
      })),
    };
  }

  async unreadCount(userId: number) {
    const count = await this.notificationRepository.countBy({
      recipientId: userId,
      isRead: false,
    });
    return { count };
  }

  /**
   * Ownership via recipientId in the UPDATE criteria — another user's id is a
   * no-match (404), never a 500 or a cross-user write.
   */
  async markRead(userId: number, id: number) {
    const result = await this.notificationRepository.update(
      { id, recipientId: userId },
      { isRead: true },
    );
    if (!result.affected) {
      throw new NotFoundException(NotFoundMessage.NotFound);
    }
    return { message: PublicMessage.Updated };
  }

  async markAllRead(userId: number) {
    await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    return { message: PublicMessage.Updated };
  }
}
