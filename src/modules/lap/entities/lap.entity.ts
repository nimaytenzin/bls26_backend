import {
  Column,
  DataType,
  Model,
  Table,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Town } from '../../town/entities/town.entity';
import { EnumerationArea } from '../../enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: false,
})
export class Lap extends Model {
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

  @ForeignKey(() => Town)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  townId: number;

  @BelongsTo(() => Town)
  town: Town;

  @HasMany(() => EnumerationArea)
  enumerationAreas: EnumerationArea[];
}
