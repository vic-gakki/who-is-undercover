import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:5173', 'http://192.168.101.2:5173'], // Allow Vue dev server
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();