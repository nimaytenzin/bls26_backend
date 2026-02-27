import {
  Column,
  DataType,
  Model,
  Table,
  HasMany,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: false,
})
export class Dzongkhag extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  areaCode: string;

  @HasMany(() => EnumerationArea)
  enumerationAreas: EnumerationArea[];
 
}
