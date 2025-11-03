import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../../location/enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: true,
  tableName: 'CurrentHouseholdListings',
})
export class CurrentHouseholdListing extends Model {
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
  eaId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  structureNumber: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  householdIdentification: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  householdSerialNumber: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  nameOfHOH: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalMale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalFemale: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phoneNumber: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  remarks: string;

  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;
}
