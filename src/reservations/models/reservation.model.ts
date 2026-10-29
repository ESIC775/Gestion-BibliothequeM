import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/models/user.model';
import { Book } from '../../books/models/book.model';

@Table({ tableName: 'reservations' })
export class Reservation extends Model {
  @ApiProperty()
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  })
  declare id: number;

  @ApiProperty()
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare reservedAt: Date;

  @ApiProperty({
    example: 'READY',
    description:
      "PENDING = en file d'attente, READY = exemplaire mis de côté au comptoir, COMPLETED = retiré (emprunté), CANCELLED = annulée, EXPIRED = non retirée à temps",
  })
  @Column({
    type: DataType.ENUM('PENDING', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED'),
    defaultValue: 'PENDING',
    allowNull: false,
  })
  declare status: 'PENDING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

  @ApiProperty({ required: false, nullable: true, description: "Date limite de retrait quand le statut est READY" })
  @Column({ type: DataType.DATE, allowNull: true })
  declare expiresAt: Date | null;

  @ApiProperty()
  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare userId: number;

  @BelongsTo(() => User)
  declare user: User;

  @ApiProperty()
  @ForeignKey(() => Book)
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare bookId: number;

  @BelongsTo(() => Book)
  declare book: Book;
}
