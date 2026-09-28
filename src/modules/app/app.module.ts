import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
import { TypeOrmConfig } from 'src/config/typeorm.config';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { BlogModule } from '../blog/blog.module';
import { AddUserToReqWOV } from 'src/common/middleware/addUserToReqWOV.middleware';
import { ImageModule } from '../image/image.module';
import { NotificationModule } from '../notification/notification.module';
import { OtpDeliveryModule } from '../otp-delivery/otp-delivery.module';
import { RateLimitMessage } from 'src/common/enums/message.enum';
import { rateLimitFromEnv } from 'src/common/config/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
    }),
    TypeOrmModule.forRoot(TypeOrmConfig()),
    // R-04 — global burst protection for every HTTP route (authenticated and
    // unauthenticated alike), backed by the default in-memory store: the app
    // is a single instance, so no Redis/shared store is needed. The OTP flow
    // keeps its own DB-backed per-user limits on top of this coarse layer.
    // Static assets, swagger and the Next.js proxy never reach Nest routes,
    // so they are not throttled by construction.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [rateLimitFromEnv(config)],
        errorMessage: RateLimitMessage.TooManyRequests,
      }),
    }),
    OtpDeliveryModule,
    AuthModule,
    UserModule,
    CategoryModule,
    BlogModule,
    ImageModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AddUserToReqWOV)
      .forRoutes('blog/by-slug/:slug', 'blog', 'user/by-username/:username');
  }
}
