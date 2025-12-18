import { EnumerationArea } from '../entities/enumeration-area.entity';
import { OperationType } from '../entities/enumeration-area-lineage.entity';

export class EaOperationDto {
  type: OperationType;
  date: Date;
  reason?: string;
  parentEaId: number;
  childEaId: number;
}

export class EaLineageNodeDto {
  ea: EnumerationArea;
  operation: EaOperationDto;
  children?: EaLineageNodeDto[];
  parents?: EaLineageNodeDto[];
}

export class EaLineageResponseDto {
  ea: EnumerationArea;
  ancestors: EaLineageNodeDto[];
  descendants: EaLineageNodeDto[];
  operations: EaOperationDto[];
}

