import { NestFactory } from '@nestjs/core';
import { SwaggerConfigInit } from './config/swagger.config';
import { AppModule } from './modules/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  SwaggerConfigInit(app);
  const { PORT } = process.env;
  await app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log(`swagger: http://localhost:${PORT}/swagger`);
  });
}

bootstrap();
