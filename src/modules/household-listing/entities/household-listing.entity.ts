import {
  Column,
  DataType,
  Model,
  Table,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Structure } from '../../structure/entities/structure.entity';
import { User } from '../../auth/entities/user.entity';

@Table({
  timestamps: true,
  tableName: 'HouseholdListings',
  indexes: [
    {
      unique: true,
      fields: ['structureId', 'householdSerialNumber'],
      name: 'unique_structure_household_serial',
    },
    { fields: ['structureId'], name: 'idx_household_listing_structure' },
    { fields: ['householdIdentification'], name: 'idx_household_identification' },
    { fields: ['userId'], name: 'idx_household_listing_user' },
  ],
})
export class HouseholdListing extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Structure)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  structureId: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  userId: number;

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

  @BelongsTo(() => Structure)
  structure: Structure;

  @BelongsTo(() => User)
  user: User;
}
