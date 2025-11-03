import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';

@Table({
  timestamps: false,
})
export class Building extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true,
  })
  structureId: number;

  @ForeignKey(() => EnumerationArea)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  enumerationAreaId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  source: string;

  @Column({
    type: DataType.GEOMETRY('MULTIPOLYGON', 4326),
    allowNull: true,
  })
  geom: string;

  @BelongsTo(() => EnumerationArea)
  enumerationArea: EnumerationArea;
}
