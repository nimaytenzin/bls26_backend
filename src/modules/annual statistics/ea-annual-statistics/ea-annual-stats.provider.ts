import { EAAnnualStats } from './entities/ea-annual-stats.entity';

export const eaAnnualStatsProviders = [
  {
    provide: 'EA_ANNUAL_STATS_REPOSITORY',
    useValue: EAAnnualStats,
  },
];
