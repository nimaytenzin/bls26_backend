import { EnumerationArea } from '../entities/enumeration-area.entity';
import { OperationType } from '../entities/enumeration-area-lineage.entity';

export class EaHistoryOperationDto {
  type: OperationType;
  date: Date;
  reason?: string;
}

export class EaHistoryNodeDto {
  ea: EnumerationArea;
  operation?: EaHistoryOperationDto;
  children: EaHistoryNodeDto[];
  parents: EaHistoryNodeDto[];
}

export class EaHistoryResponseDto {
  currentEa: EnumerationArea;
  history: {
    ancestors: EaHistoryNodeDto[];
    descendants: EaHistoryNodeDto[];
  };
}

