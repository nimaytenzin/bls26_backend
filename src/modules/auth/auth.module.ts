import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { SupervisorDzongkhag } from './entities/supervisor-dzongkhag.entity';
import { JwtStrategy } from './guards/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-this',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: 'USER_REPOSITORY',
      useValue: User,
    },
    {
      provide: 'SUPERVISOR_DZONGKHAG_REPOSITORY',
      useValue: SupervisorDzongkhag,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
