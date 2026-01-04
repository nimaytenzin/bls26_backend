import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { User } from 'src/modules/auth/entities/user.entity';
import { Survey } from '../../survey/entities/survey.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';

@Table({
  tableName: 'survey_enumerators',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'surveyId', 'dzongkhagId'],
      name: 'survey_enumerators_user_survey_dzongkhag_unique',
    },
  ],
})
export class SurveyEnumerator extends Model<SurveyEnumerator> {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
  })
  userId: number;

  @ForeignKey(() => Survey)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    primaryKey: true, // Part of composite primary key
  })
  surveyId: number;

  @ForeignKey(() => Dzongkhag)
  @Column({
    type: DataType.INTEGER,
    allowNull: false, // Changed to NOT NULL since it's part of the key
    primaryKey: true, // Added as part of composite primary key
  })
  dzongkhagId: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive: boolean;

  // Relationships
  @BelongsTo(() => User)
  user: User;

  @BelongsTo(() => Survey)
  survey: Survey;

  @BelongsTo(() => Dzongkhag)
  dzongkhag: Dzongkhag;
}
