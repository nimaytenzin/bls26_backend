import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { SupervisorDzongkhag } from './entities/supervisor-dzongkhag.entity';
import { SurveyEnumerator } from '../survey/survey-enumerator/entities/survey-enumerator.entity';
import { JwtStrategy } from './guards/jwt.strategy';
import { SupervisorHelperService } from './services/supervisor-helper.service';
import { EnumerationArea } from '../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';

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
    SupervisorHelperService,
    {
      provide: 'USER_REPOSITORY',
      useValue: User,
    },
    {
      provide: 'SUPERVISOR_DZONGKHAG_REPOSITORY',
      useValue: SupervisorDzongkhag,
    },
    {
      provide: 'SURVEY_ENUMERATOR_REPOSITORY',
      useValue: SurveyEnumerator,
    },
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
    {
      provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
      useValue: SurveyEnumerationArea,
    },
  ],
  exports: [AuthService, SupervisorHelperService],
})
export class AuthModule {}
