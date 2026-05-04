import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './profile.schema';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { SeederService } from './seeder.service';
import { CacheService } from './cache.service';
import { QueryNormalizerService } from './query-normalizer.service';
import { CsvIngestionService } from './csv-ingestion.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    AuthModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, SeederService, CacheService, QueryNormalizerService, CsvIngestionService],
})
export class ProfilesModule implements OnModuleInit {
  constructor(private readonly seederService: SeederService) {}

  async onModuleInit() {
    await this.seederService.seedDatabase();
  }
}
