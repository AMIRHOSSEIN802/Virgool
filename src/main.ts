import { NestFactory } from '@nestjs/core';
import { SwaggerConfigInit } from './config/swagger.config';
import { AppModule } from './modules/app/app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createAppValidationPipe } from './common/pipes/app-validation.pipe';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  SwaggerConfigInit(app);
  app.useStaticAssets('public');
  app.useGlobalPipes(createAppValidationPipe());
  // R-04: the API is reached through the Next.js `/api` rewrite proxy — trust
  // that single hop so the rate limiter sees the real client IP in
  // `X-Forwarded-For` instead of bucketing every visitor behind the proxy.
  app.set('trust proxy', 1);
  app.use(cookieParser(process.env.COOKIE_SECRET));
  const { PORT } = process.env;
  await app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log(`swagger: http://localhost:${PORT}/swagger`);
  });
}

bootstrap();
