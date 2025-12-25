import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from '../../auth/entities/user.entity';

export enum MapVisualizationMode {
  HOUSEHOLDS = 'households',
  ENUMERATION_AREAS = 'enumerationAreas',
}

export enum ColorScaleType {
  BLUE = 'blue',
  GREEN = 'green',
  RED = 'red',
  PURPLE = 'purple',
  ORANGE = 'orange',
  GRAY = 'gray',
  VIRIDIS = 'viridis',
  PLASMA = 'plasma',
}

@Table({
  timestamps: true,
  tableName: 'public_page_settings',
})
export class PublicPageSettings extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    allowNull: false,
  })
  id: number;

  @Column({
    type: DataType.ENUM(...Object.values(MapVisualizationMode)),
    allowNull: false,
    defaultValue: MapVisualizationMode.HOUSEHOLDS,
  })
  mapVisualizationMode: MapVisualizationMode;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    defaultValue: 'positron',
  })
  selectedBasemapId: string;

  @Column({
    type: DataType.ENUM(...Object.values(ColorScaleType)),
    allowNull: false,
    defaultValue: ColorScaleType.BLUE,
  })
  colorScale: ColorScaleType;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    defaultValue: 'National Sampling Frame',
  })
  nationalDataViewerTitle: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  nationalDataViewerDescription: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  nationalDataViewerInfoBoxContent: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  nationalDataViewerInfoBoxStats: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  createdBy: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  updatedBy: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  updatedAt: Date;

  // Associations
  @BelongsTo(() => User, 'createdBy')
  creator: User;

  @BelongsTo(() => User, 'updatedBy')
  updater: User;
}

