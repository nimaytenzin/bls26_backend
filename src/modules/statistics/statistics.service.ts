import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
  ) {}

  async getEnumeratorStats(userId: number): Promise<{
    userId: number;
    totalHouseholdsSubmitted: number;
  }> {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const totalHouseholdsSubmitted = await this.householdListingRepository.count({
      where: { userId },
    });
    return {
      userId,
      totalHouseholdsSubmitted,
    };
  }

  async exportData(format: 'json' | 'csv' = 'json'): Promise<any> {
    const listings = await this.householdListingRepository.findAll({
      include: [
        { association: 'structure', include: ['enumerationArea'] },
        { association: 'user', attributes: ['id', 'name', 'cid'], exclude: ['password'] } as any,
      ],
    });
    const data = listings.map((l) => (l as any).toJSON());
    if (format === 'csv') {
      return this.toCsv(data);
    }
    return data;
  }

  private toCsv(rows: any[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      const s =
        v !== null && typeof v === 'object'
          ? JSON.stringify(v)
          : String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
    ];
    return lines.join('\n');
  }
}
