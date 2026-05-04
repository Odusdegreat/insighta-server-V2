import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './profile.schema';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { SeederService } from './seeder.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    AuthModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, SeederService],
})
export class ProfilesModule implements OnModuleInit {
  constructor(private readonly seederService: SeederService) {}

  async onModuleInit() {
    await this.seederService.seedDatabase();
  }
}
