import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*', // Allow Vue dev server
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  // 9488 mean who is the undercover
  await app.listen(9488);
  console.log('Server running on http://localhost:9488');
}
bootstrap();