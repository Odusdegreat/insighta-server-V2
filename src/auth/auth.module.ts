import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { RefreshToken, RefreshTokenSchema } from './refresh-token.schema';
import { AuthService } from './auth.service';
import { AuthController, UsersController } from './auth.controller';

@Module({
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: RefreshToken.name, schema: RefreshTokenSchema }
  ])],
  controllers: [AuthController, UsersController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
