import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ValidateService } from './validate.service';

@Controller('validate')
export class ValidateController {
  constructor(private readonly validateService: ValidateService) {}

  @Get('structure-number/:eaId/:number')
  async checkStructureNumber(
    @Param('eaId', ParseIntPipe) eaId: number,
    @Param('number') number: string,
  ) {
    const available = await this.validateService.isStructureNumberUnique(
      eaId,
      number,
    );
    return { available };
  }

  @Get('household-serial/:structId/:serial')
  async checkHouseholdSerial(
    @Param('structId', ParseIntPipe) structId: number,
    @Param('serial', ParseIntPipe) serial: number,
  ) {
    const available = await this.validateService.isHouseholdSerialUnique(
      structId,
      serial,
    );
    return { available };
  }

  @Get('ea-completion/:eaId')
  async checkEaCompletion(@Param('eaId', ParseIntPipe) eaId: number) {
    return this.validateService.checkEaCompletion(eaId);
  }
}
