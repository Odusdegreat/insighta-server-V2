import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile } from './profile.schema';
import { randomUUID } from 'crypto';

export interface ProfileFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
}

export interface PaginationAndSort {
  page?: number;
  limit?: number;
  sort_by?: 'age' | 'created_at' | 'gender_probability';
  order?: 'asc' | 'desc';
}

function getAgeGroup(age: number): string {
  if (age < 13) return 'child';
  if (age < 20) return 'teenager';
  if (age < 60) return 'adult';
  return 'senior';
}

const COUNTRY_MAP: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AR: 'Argentina', AU: 'Australia', AT: 'Austria', BD: 'Bangladesh', BE: 'Belgium',
  BR: 'Brazil', CA: 'Canada', CL: 'Chile', CN: 'China', CO: 'Colombia',
  EG: 'Egypt', ET: 'Ethiopia', FI: 'Finland', FR: 'France', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', IN: 'India', ID: 'Indonesia', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JP: 'Japan', KE: 'Kenya', MY: 'Malaysia',
  MX: 'Mexico', NL: 'Netherlands', NZ: 'New Zealand', NG: 'Nigeria', NO: 'Norway',
  PK: 'Pakistan', PH: 'Philippines', PL: 'Poland', PT: 'Portugal', RO: 'Romania',
  RU: 'Russia', SA: 'Saudi Arabia', SG: 'Singapore', ZA: 'South Africa',
  KR: 'South Korea', ES: 'Spain', SE: 'Sweden', CH: 'Switzerland', TH: 'Thailand',
  TR: 'Turkey', UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom',
  US: 'United States', VN: 'Vietnam',
};

@Injectable()
export class ProfilesService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<Profile>,
  ) {}

  private buildFilter(filters: ProfileFilters): any {
    const filter: any = {};

    if (filters.gender) {
      filter.gender = filters.gender.toLowerCase();
    }
    if (filters.age_group) {
      filter.age_group = filters.age_group.toLowerCase();
    }
    if (filters.country_id) {
      if (filters.country_id.length > 2) {
        filter.country_name = new RegExp(`^${filters.country_id}$`, 'i');
      } else {
        filter.country_id = filters.country_id.toUpperCase();
      }
    }
    if (filters.min_age !== undefined || filters.max_age !== undefined) {
      filter.age = {};
      if (filters.min_age !== undefined) filter.age.$gte = filters.min_age;
      if (filters.max_age !== undefined) filter.age.$lte = filters.max_age;
    }
    if (filters.min_gender_probability !== undefined) {
      filter.gender_probability = { $gte: filters.min_gender_probability };
    }
    if (filters.min_country_probability !== undefined) {
      filter.country_probability = { $gte: filters.min_country_probability };
    }

    return filter;
  }

  private buildLinks(
    basePath: string,
    page: number,
    limit: number,
    totalPages: number,
    extraParams?: Record<string, string>,
  ) {
    const buildUrl = (p: number) => {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (extraParams) {
        for (const [key, val] of Object.entries(extraParams)) {
          if (val !== undefined && val !== '') {
            params.set(key, val);
          }
        }
      }
      return `${basePath}?${params.toString()}`;
    };

    return {
      self: buildUrl(page),
      next: page < totalPages ? buildUrl(page + 1) : null,
      prev: page > 1 ? buildUrl(page - 1) : null,
    };
  }

  async createProfiles(data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];

    const mappedItems = items.map((item) => {
      const copy = { ...item };
      if (!copy.id) {
        copy.id = randomUUID();
      }
      return copy;
    });

    return await this.profileModel.insertMany(mappedItems);
  }

  async deleteAll() {
    await this.profileModel.deleteMany({});
  }

  async findById(id: string): Promise<Profile | null> {
    return this.profileModel.findOne({ id });
  }

  async findAll(
    filters: ProfileFilters,
    pagination: PaginationAndSort,
    basePath: string = '/api/profiles',
    extraParams?: Record<string, string>,
  ) {
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 10, 100);
    const skip = (page - 1) * limit;

    const sortBy = pagination.sort_by || 'created_at';
    const order = (pagination.order || 'desc') === 'asc' ? 1 : -1;

    const filter = this.buildFilter(filters);

    const [data, total] = await Promise.all([
      this.profileModel
        .find(filter)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.profileModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      status: 'success',
      page,
      limit,
      total,
      total_pages: totalPages,
      links: this.buildLinks(basePath, page, limit, totalPages, extraParams),
      data,
    };
  }

  async createProfileFromName(name: string): Promise<Profile> {
    const genderRes = await fetch(`https://api.genderize.io?name=${encodeURIComponent(name.split(' ')[0])}`);
    const genderData = await genderRes.json();

    const ageRes = await fetch(`https://api.agify.io?name=${encodeURIComponent(name.split(' ')[0])}`);
    const ageData = await ageRes.json();

    const nationRes = await fetch(`https://api.nationalize.io?name=${encodeURIComponent(name.split(' ')[0])}`);
    const nationData = await nationRes.json();

    const gender = genderData.gender || 'unknown';
    const genderProbability = genderData.probability || 0;
    const age = ageData.age || 0;
    const ageGroup = getAgeGroup(age);

    const topCountry = nationData.country?.[0] || {};
    const countryId = topCountry.country_id || 'XX';
    const countryProbability = topCountry.probability || 0;
    const countryName = COUNTRY_MAP[countryId] || countryId;

    return await this.profileModel.create({
      id: randomUUID(),
      name,
      gender,
      gender_probability: genderProbability,
      age,
      age_group: ageGroup,
      country_id: countryId,
      country_name: countryName,
      country_probability: countryProbability,
    });
  }

  async exportCSV(
    filters: ProfileFilters,
    sortConfig?: { sort_by?: string; order?: string },
  ): Promise<string> {
    const sortBy = sortConfig?.sort_by || 'created_at';
    const order = (sortConfig?.order || 'desc') === 'asc' ? 1 : -1;

    const filter = this.buildFilter(filters);

    const profiles = await this.profileModel
      .find(filter)
      .sort({ [sortBy]: order })
      .exec();

    const headers = [
      'id', 'name', 'gender', 'gender_probability', 'age',
      'age_group', 'country_id', 'country_name', 'country_probability', 'created_at',
    ];

    const csvRows = [headers.join(',')];

    for (const p of profiles) {
      const row = [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.gender,
        p.gender_probability,
        p.age,
        p.age_group,
        p.country_id,
        `"${(p.country_name || '').replace(/"/g, '""')}"`,
        p.country_probability,
        p.created_at,
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  parseNaturalLanguage(q: string): ProfileFilters {
    if (!q || typeof q !== 'string') {
      throw new BadRequestException('Unable to interpret query');
    }

    const lowerQ = q.toLowerCase();
    const filters: ProfileFilters = {};

    let matchedSomething = false;

    if (/\bfemales?\b/.test(lowerQ) || /\b(women|woman|girl|girls)\b/.test(lowerQ)) {
      filters.gender = 'female';
      matchedSomething = true;
    } else if (/\bmales?\b/.test(lowerQ) || /\b(men|man|boy|boys)\b/.test(lowerQ)) {
      filters.gender = 'male';
      matchedSomething = true;
    }

    if (lowerQ.includes('young')) {
      filters.min_age = 16;
      filters.max_age = 24;
      matchedSomething = true;
    }
    if (/\bteenagers?\b/.test(lowerQ)) {
      filters.age_group = 'teenager';
      matchedSomething = true;
    }
    if (/\badults?\b/.test(lowerQ)) {
      filters.age_group = 'adult';
      matchedSomething = true;
    }
    if (/\b(child|children)\b/.test(lowerQ)) {
      filters.age_group = 'child';
      matchedSomething = true;
    }
    if (/\bseniors?\b/.test(lowerQ) || /\b(elderly|old)\b/.test(lowerQ)) {
      filters.age_group = 'senior';
      matchedSomething = true;
    }

    const aboveMatch = lowerQ.match(/(?:above|over|older than|greater than)\s+(\d+)/);
    if (aboveMatch) {
      filters.min_age = parseInt(aboveMatch[1], 10);
      matchedSomething = true;
    }

    const belowMatch = lowerQ.match(/(?:below|under|younger than|less than)\s+(\d+)/);
    if (belowMatch) {
      filters.max_age = parseInt(belowMatch[1], 10);
      matchedSomething = true;
    }

    const betweenMatch = lowerQ.match(/between\s+(\d+)\s+and\s+(\d+)/);
    if (betweenMatch) {
      filters.min_age = parseInt(betweenMatch[1], 10);
      filters.max_age = parseInt(betweenMatch[2], 10);
      matchedSomething = true;
    }

    const fromMatch = lowerQ.match(/from\s+([a-z\s]+?)(\s+(above|below|under|over|older|younger|between).*)?$/);
    if (fromMatch) {
      const parsedCountry = fromMatch[1].trim();
      if (parsedCountry) {
        filters.country_id = parsedCountry;
        matchedSomething = true;
      }
    }

    if (!filters.country_id) {
      const inMatch = lowerQ.match(/\bin\s+([a-z\s]+?)(\s+(above|below|under|over|older|younger|between).*)?$/);
      if (inMatch) {
        const parsedCountry = inMatch[1].trim();
        if (parsedCountry) {
          filters.country_id = parsedCountry;
          matchedSomething = true;
        }
      }
    }

    if (!filters.country_id) {
      if (/\b(nigeria|nigerians?|ng)\b/.test(lowerQ)) { filters.country_id = 'NG'; matchedSomething = true; }
      else if (/\b(united states|americans?|usa?)\b/.test(lowerQ)) { filters.country_id = 'US'; matchedSomething = true; }
      else if (/\b(united kingdom|british|uk|gb)\b/.test(lowerQ)) { filters.country_id = 'GB'; matchedSomething = true; }
      else if (/\b(ghana|ghanaians?|gh)\b/.test(lowerQ)) { filters.country_id = 'GH'; matchedSomething = true; }
      else if (/\b(kenya|kenyans?|ke)\b/.test(lowerQ)) { filters.country_id = 'KE'; matchedSomething = true; }
      else if (/\b(south africa|south africans?|za)\b/.test(lowerQ)) { filters.country_id = 'ZA'; matchedSomething = true; }
      else if (/\b(india|indians?|in)\b/.test(lowerQ)) { filters.country_id = 'IN'; matchedSomething = true; }
      else {
        for (const [code, name] of Object.entries(COUNTRY_MAP)) {
          if (new RegExp(`\\b${name.toLowerCase()}\\b`).test(lowerQ) || new RegExp(`\\b${code.toLowerCase()}\\b`).test(lowerQ)) {
            filters.country_id = code;
            matchedSomething = true;
            break;
          }
        }
      }
    }

    if (!matchedSomething) {
      throw new BadRequestException('Unable to interpret query');
    }

    return filters;
  }
}
