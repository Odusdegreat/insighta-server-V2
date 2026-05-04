import { Injectable } from '@nestjs/common';
import { ProfileFilters } from './profiles.service';

@Injectable()
export class QueryNormalizerService {
  normalize(filters: ProfileFilters): string {
    // Create a canonical representation of the filters
    // Sort keys, normalize values, ensure consistent format
    const normalized: any = {};

    // Gender: lowercase
    if (filters.gender !== undefined) {
      normalized.gender = filters.gender.toLowerCase();
    }

    // Age group: lowercase
    if (filters.age_group !== undefined) {
      normalized.age_group = filters.age_group.toLowerCase();
    }

    // Country: uppercase for codes, lowercase for names
    if (filters.country_id !== undefined) {
      const country = filters.country_id;
      normalized.country_id = country.length <= 2 ? country.toUpperCase() : country.toLowerCase();
    }

    // Numeric filters: ensure consistent representation
    if (filters.min_age !== undefined) {
      normalized.min_age = Number(filters.min_age);
    }
    if (filters.max_age !== undefined) {
      normalized.max_age = Number(filters.max_age);
    }
    if (filters.min_gender_probability !== undefined) {
      normalized.min_gender_probability = Number(filters.min_gender_probability);
    }
    if (filters.min_country_probability !== undefined) {
      normalized.min_country_probability = Number(filters.min_country_probability);
    }

    // Sort keys and stringify deterministically
    return JSON.stringify(this.sortObjectKeys(normalized));
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = this.sortObjectKeys(obj[key]);
        return acc;
      }, {} as any);
  }
}
