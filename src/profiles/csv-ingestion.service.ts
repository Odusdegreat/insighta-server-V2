import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile } from './profile.schema';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { COUNTRY_MAP } from './profiles.service';

export interface IngestionResult {
  status: string;
  total_rows: number;
  inserted: number;
  skipped: number;
  reasons: {
    duplicate_name?: number;
    invalid_age?: number;
    missing_fields?: number;
    malformed?: number;
    invalid_gender?: number;
  };
}

@Injectable()
export class CsvIngestionService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<Profile>,
  ) {}

  async processCSVStream(
    stream: Readable,
    chunkSize: number = 1000,
  ): Promise<IngestionResult> {
    const result: IngestionResult = {
      status: 'success',
      total_rows: 0,
      inserted: 0,
      skipped: 0,
      reasons: {},
    };

    let chunk: any[] = [];
    const existingNames = new Set<string>();

    // Preload existing names for duplicate detection
    const existingProfiles = await this.profileModel.find({}, 'name').exec();
    for (const profile of existingProfiles) {
      existingNames.add(profile.name.toLowerCase());
    }

    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', async (row) => {
          result.total_rows++;

          try {
            const validated = this.validateRow(row);
            if (!validated.valid) {
              result.skipped++;
              const reason = validated.reason || 'malformed';
              (result.reasons as any)[reason] = ((result.reasons as any)[reason] || 0) + 1;
              return;
            }

            // Check for duplicate name
            const nameKey = validated.data.name.toLowerCase();
            if (existingNames.has(nameKey)) {
              result.skipped++;
              result.reasons.duplicate_name = (result.reasons.duplicate_name || 0) + 1;
              return;
            }

            chunk.push(validated.data);
            existingNames.add(nameKey);

            // Insert in chunks to avoid memory issues
            if (chunk.length >= chunkSize) {
              stream.pause();
              const toInsert = [...chunk];
              chunk = [];
              try {
                await this.profileModel.insertMany(toInsert, { ordered: false });
                result.inserted += toInsert.length;
              } catch (e: any) {
                // Handle partial failures in insertMany
                if (e.writeErrors) {
                  result.inserted += toInsert.length - e.writeErrors.length;
                  result.skipped += e.writeErrors.length;
                  result.reasons.duplicate_name = (result.reasons.duplicate_name || 0) + e.writeErrors.length;
                }
              }
              stream.resume();
            }
          } catch (err) {
            result.skipped++;
            result.reasons.malformed = (result.reasons.malformed || 0) + 1;
          }
        })
        .on('end', async () => {
          // Insert remaining chunk
          if (chunk.length > 0) {
            try {
              await this.profileModel.insertMany(chunk, { ordered: false });
              result.inserted += chunk.length;
            } catch (e: any) {
              if (e.writeErrors) {
                result.inserted += chunk.length - e.writeErrors.length;
                result.skipped += e.writeErrors.length;
                result.reasons.duplicate_name = (result.reasons.duplicate_name || 0) + e.writeErrors.length;
              }
            }
          }
          resolve(result);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  private validateRow(row: any): { valid: boolean; data?: any; reason?: string } {
    // Check required fields
    const requiredFields = ['name', 'gender', 'age', 'country_id', 'country_name'];
    for (const field of requiredFields) {
      if (!row[field] && row[field] !== 0) {
        return { valid: false, reason: 'missing_fields' };
      }
    }

    // Validate gender
    const validGenders = ['male', 'female', 'unknown'];
    if (!validGenders.includes(row.gender.toLowerCase())) {
      return { valid: false, reason: 'invalid_gender' };
    }

    // Validate age
    const age = Number(row.age);
    if (isNaN(age) || age < 0 || age > 150) {
      return { valid: false, reason: 'invalid_age' };
    }

    // Validate country_id (2-letter code)
    if (typeof row.country_id !== 'string' || row.country_id.length !== 2) {
      return { valid: false, reason: 'missing_fields' };
    }

    // Build profile object
    const profile = {
      id: row.id || randomUUID(),
      name: row.name,
      gender: row.gender.toLowerCase(),
      gender_probability: Number(row.gender_probability) || 0,
      age: age,
      age_group: row.age_group || this.getAgeGroup(age),
      country_id: row.country_id.toUpperCase(),
      country_name: row.country_name,
      country_probability: Number(row.country_probability) || 0,
    };

    return { valid: true, data: profile };
  }

  private getAgeGroup(age: number): string {
    if (age < 13) return 'child';
    if (age < 20) return 'teenager';
    if (age < 60) return 'adult';
    return 'senior';
  }
}
