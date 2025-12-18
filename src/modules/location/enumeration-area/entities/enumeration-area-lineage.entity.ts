import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { EnumerationArea } from './enumeration-area.entity';

export enum OperationType {
  SPLIT = 'SPLIT',
  MERGE = 'MERGE',
}

@Table({
  timestamps: false,
  tableName: 'EnumerationAreaLineages',
  indexes: [
    {
      fields: ['parentEaId'],
      name: 'idx_parent_ea',
    },
    {
      fields: ['childEaId'],
      name: 'idx_child_ea',
    },
    {
      fields: ['operationType'],
      name: 'idx_operation_type',
    },
    {
      fields: ['parentEaId', 'childEaId'],
      name: 'idx_parent_child',
    },
  ],
})
export class EnumerationAreaLineage extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  parentEaId: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  childEaId: number;

  @Column({
    type: DataType.ENUM('SPLIT', 'MERGE'),
    allowNull: false,
  })
  operationType: OperationType;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  operationDate: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason: string;

  // Relationships
  @BelongsTo(() => EnumerationArea, 'parentEaId')
  parentEa: EnumerationArea;

  @BelongsTo(() => EnumerationArea, 'childEaId')
  childEa: EnumerationArea;
}

