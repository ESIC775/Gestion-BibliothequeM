import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DAY_MS, LIBRARY_RULES } from '../../circulation/circulation.rules';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/models/user.model';
import { Book } from '../../books/models/book.model';

@Table({ tableName: 'loans' })
export class Loan extends Model {
  @ApiProperty()
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ApiProperty()
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare borrowedAt: Date;

  @ApiProperty()
  @Column({ type: DataType.DATE, allowNull: false })
  declare dueDate: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: DataType.DATE, allowNull: true })
  declare returnedAt: Date | null;

  @ApiProperty({ example: 'BORROWED' })
  @Column({
    type: DataType.ENUM('BORROWED', 'RETURNED'),
    allowNull: false,
    defaultValue: 'BORROWED',
  })
  declare status: 'BORROWED' | 'RETURNED';

  @ApiProperty({ description: 'Nombre de renouvellements déjà effectués' })
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare renewals: number;

  @ApiProperty({ description: 'true si le livre est encore dehors après la date de retour prévue' })
  @Column({
    type: DataType.VIRTUAL(DataType.BOOLEAN),
    get(this: Loan) {
      return this.getDataValue('status') === 'BORROWED' && new Date(this.getDataValue('dueDate')) < new Date();
    },
  })
  declare overdue: boolean;

  @ApiProperty({ description: 'Jours de retard (en cours, ou constatés au retour)' })
  @Column({
    type: DataType.VIRTUAL(DataType.INTEGER),
    get(this: Loan) {
      const due = new Date(this.getDataValue('dueDate')).getTime();
      const returned = this.getDataValue('returnedAt');
      const end = returned ? new Date(returned).getTime() : Date.now();
      return end > due ? Math.ceil((end - due) / DAY_MS) : 0;
    },
  })
  declare daysLate: number;

  @ApiProperty({ description: 'Amende en euros (0,20 € par jour de retard)' })
  @Column({
    type: DataType.VIRTUAL(DataType.FLOAT),
    get(this: Loan) {
      const due = new Date(this.getDataValue('dueDate')).getTime();
      const returned = this.getDataValue('returnedAt');
      const end = returned ? new Date(returned).getTime() : Date.now();
      const days = end > due ? Math.ceil((end - due) / DAY_MS) : 0;
      return Math.round(days * LIBRARY_RULES.FINE_PER_DAY * 100) / 100;
    },
  })
  declare fine: number;

  @ApiProperty()
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @ApiProperty()
  @ForeignKey(() => Book)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare bookId: number;

  @ApiProperty({ type: () => User })
  @BelongsTo(() => User)
  declare user: User;

  @ApiProperty({ type: () => Book })
  @BelongsTo(() => Book)
  declare book: Book;
}
