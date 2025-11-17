import { DzongkhagAnnualStats } from './entities/dzongkhag-annual-stats.entity';

export const dzongkhagAnnualStatsProviders = [
  {
    provide: 'DZONGKHAG_ANNUAL_STATS_REPOSITORY',
    useValue: DzongkhagAnnualStats,
  },
];
