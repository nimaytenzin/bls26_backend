import {
  Column,
  DataType,
  Model,
  Table,
  HasMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Dzongkhag } from '../../dzongkhag/entities/dzongkhag.entity';
import { Lap } from '../../lap/entities/lap.entity';

@Table({
  timestamps: false,
})
export class Town extends Model {
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

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  dzongkhagId: number;

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;

  @HasMany(() => Lap)
  laps: Lap[];
}
