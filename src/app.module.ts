import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { ConfigModule } from '@nestjs/config';
import { HttpException, HttpStatus, Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
class CustomThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new HttpException(
      { status: 'error', message: 'Too Many Requests' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/insighta'),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 60,
      },
    ]),
    AuthModule,
    ProfilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
