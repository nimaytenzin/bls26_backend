import { SAZAnnualStats } from './entities/saz-annual-stats.entity';

export const sazAnnualStatsProviders = [
  {
    provide: 'SAZ_ANNUAL_STATS_REPOSITORY',
    useValue: SAZAnnualStats,
  },
];
