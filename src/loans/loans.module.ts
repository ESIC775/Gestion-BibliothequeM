import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from './models/loan.model';
import { User } from '../users/models/user.model';
import { Book } from '../books/models/book.model';
import { Category } from '../categories/models/category.model';
import { Author } from '../authors/models/author.model';
import { BookAuthor } from '../books/models/book-author.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationModule } from '../circulation/circulation.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Loan, User, Book, Category, Author, BookAuthor, Reservation]),
    CirculationModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
