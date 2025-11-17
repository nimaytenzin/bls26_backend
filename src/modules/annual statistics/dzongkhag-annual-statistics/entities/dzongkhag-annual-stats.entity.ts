import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { Dzongkhag } from '../../../location/dzongkhag/entities/dzongkhag.entity';

@Table({
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['dzongkhagId', 'year'],
      name: 'unique_dzongkhag_year',
    },
    {
      fields: ['year', 'dzongkhagId'],
      name: 'idx_year_dzongkhag',
    },
    {
      fields: ['dzongkhagId'],
      name: 'idx_dzongkhag',
    },
  ],
})
export class DzongkhagAnnualStats extends Model<DzongkhagAnnualStats> {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  dzongkhagId: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  year: number;

  // EA: Enumeration Area
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  eaCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'EAs under Thromde (urban)',
  })
  urbanEACount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'EAs under Gewog (rural)',
  })
  ruralEACount: number;

  // SAZ: Sub-Administrative Zone
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sazCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of SAZs under Thromde (urban)',
  })
  urbanSAZCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of SAZs under Gewog (rural)',
  })
  ruralSAZCount: number;

  // AZ: Administrative Zone
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of Administrative Zones in the Dzongkhag',
  })
  azCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of Thromde (urban AZ)',
  })
  urbanAZCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of Gewog (rural AZ)',
  })
  ruralAZCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalHouseholds: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  urbanHouseholdCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  ruralHouseholdCount: number;

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
  urbanMale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  ruralMale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  totalFemale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  urbanFemale: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  ruralFemale: number;

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;
}
