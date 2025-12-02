import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as bodyParser from 'body-parser';

config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  app.enableCors();

  // Increase body size limit to 50MB for large GeoJSON uploads
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log('========================================');
  console.log('🚀 APPLICATION STARTED');
  console.log('========================================');
  console.log(`Server running on port: ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${port}`);
  console.log('========================================');
}

bootstrap();
