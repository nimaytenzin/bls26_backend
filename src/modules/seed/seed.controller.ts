import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('seed')
@UseGuards(RolesGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('locations')
  @Roles(UserRole.ADMIN)
  seedLocations() {
    return this.seedService.seedLocations();
  }
}
