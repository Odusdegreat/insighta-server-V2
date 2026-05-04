import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile } from './profile.schema';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<Profile>,
  ) {}

  async seedDatabase() {
    const count = await this.profileModel.countDocuments();
    if (count > 0) {
      this.logger.log(`Database already has ${count} records. Skipping seed.`);
      return;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'data.json'),
      path.join(__dirname, '..', '..', 'data.json'),
      '/var/task/data.json',
      '/var/task/src/data.json',
    ];

    let seedFilePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        seedFilePath = p;
        break;
      }
    }

    if (seedFilePath) {
      try {
        const rawData = fs.readFileSync(seedFilePath, 'utf8');
        const parsed = JSON.parse(rawData);
        const items = Array.isArray(parsed) ? parsed : parsed.profiles || [];

        const mappedItems = items.map(item => ({
          ...item,
          id: item.id || randomUUID(),
        }));

        await this.profileModel.insertMany(mappedItems);
        this.logger.log(`Successfully seeded ${mappedItems.length} records from ${seedFilePath}`);
      } catch (e) {
        this.logger.error(`Failed to seed data: ${e.message}`);
      }
    } else {
      this.logger.warn('Seed data file not found in any known location.');
    }
  }
}
