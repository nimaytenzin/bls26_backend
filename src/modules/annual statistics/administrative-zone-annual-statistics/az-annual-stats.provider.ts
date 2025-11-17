import { AZAnnualStats } from './entities/az-annual-stats.entity';

export const azAnnualStatsProviders = [
  {
    provide: 'AZ_ANNUAL_STATS_REPOSITORY',
    useValue: AZAnnualStats,
  },
];
