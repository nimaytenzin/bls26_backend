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
import { EnumerationAreaStatus } from '../enums/enumeration-area-status.enum';
import { Structure } from 'src/modules/structure/entities/structure.entity';

@Table({
  timestamps: false,
  tableName: 'EnumerationAreas',
})
export class EnumerationArea extends Model {
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
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  areaCode: string;

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  dzongkhagId: number;

  @Column({
    type: DataType.ENUM(...Object.values(EnumerationAreaStatus)),
    allowNull: false,
    defaultValue: EnumerationAreaStatus.INCOMPLETE,
  })
  status: EnumerationAreaStatus;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;

  @HasMany(() => Structure)
  structures: Structure[];
}

