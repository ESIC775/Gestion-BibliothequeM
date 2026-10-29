import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { Book } from './models/book.model';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Category } from '../categories/models/category.model';
import { Author } from '../authors/models/author.model';
import { Loan } from '../loans/models/loan.model';
import { User } from '../users/models/user.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationService } from '../circulation/circulation.service';
import { AuthUser, isAdmin } from '../auth/auth.decorators';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book) private readonly bookModel: typeof Book,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(Author) private readonly authorModel: typeof Author,
    @InjectModel(Loan) private readonly loanModel: typeof Loan,
    @InjectModel(Reservation) private readonly reservationModel: typeof Reservation,
    private readonly circulation: CirculationService,
  ) {}

  /** Un adhérent ne voit pas qui a emprunté quoi ; seul le bibliothécaire a l'historique des prêts. */
  private includes(user?: AuthUser) {
    return isAdmin(user)
      ? [Category, Author, { model: Loan, include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email'] }] }]
      : [Category, Author];
  }

  async create(createBookDto: CreateBookDto) {
    await this.ensureCategoryExists(createBookDto.categoryId);
    const authors = await this.ensureAuthorsExist(createBookDto.authorIds);

    const book = await this.bookModel.create({
      title: createBookDto.title,
      isbn: createBookDto.isbn,
      publishedYear: createBookDto.publishedYear,
      totalCopies: createBookDto.totalCopies,
      // Un livre neuf est entièrement disponible.
      availableCopies: createBookDto.totalCopies,
      summary: createBookDto.summary,
      coverUrl: createBookDto.coverUrl,
      categoryId: createBookDto.categoryId,
    });

    await book.$set('authors', authors);
    return this.findOne(book.id, { role: 'ADMIN' } as AuthUser);
  }

  async findAll(user?: AuthUser) {
    // Met à jour la disponibilité (réservations non retirées expirées) avant d'afficher le catalogue.
    await this.circulation.expireStale();
    return this.bookModel.findAll({
      include: this.includes(user),
      order: [['id', 'ASC']],
    });
  }

  async findOne(id: number, user?: AuthUser) {
    await this.circulation.expireStale();
    const book = await this.bookModel.findByPk(id, {
      include: this.includes(user),
    });

    if (!book) {
      throw new NotFoundException(`Livre ${id} introuvable.`);
    }

    return book;
  }

  async update(id: number, updateBookDto: UpdateBookDto) {
    const book = await this.findOne(id);

    if (updateBookDto.categoryId) {
      await this.ensureCategoryExists(updateBookDto.categoryId);
    }

    // Le stock disponible suit le total : +2 exemplaires achetés = +2 disponibles.
    // On ne peut pas descendre sous le nombre d'exemplaires actuellement dehors ou mis de côté.
    const nextTotal = updateBookDto.totalCopies ?? book.totalCopies;
    const nextAvailable = book.availableCopies + (nextTotal - book.totalCopies);
    if (nextAvailable < 0) {
      throw new BadRequestException(
        `Impossible de passer à ${nextTotal} exemplaire(s) : ${book.totalCopies - book.availableCopies} sont prêtés ou réservés.`,
      );
    }

    await book.update({
      title: updateBookDto.title ?? book.title,
      isbn: updateBookDto.isbn ?? book.isbn,
      publishedYear: updateBookDto.publishedYear ?? book.publishedYear,
      totalCopies: nextTotal,
      availableCopies: nextAvailable,
      summary: updateBookDto.summary ?? book.summary,
      coverUrl: updateBookDto.coverUrl ?? book.coverUrl,
      categoryId: updateBookDto.categoryId ?? book.categoryId,
    });

    if (updateBookDto.authorIds) {
      const authors = await this.ensureAuthorsExist(updateBookDto.authorIds);
      await book.$set('authors', authors);
    }

    return this.findOne(id, { role: 'ADMIN' } as AuthUser);
  }

  async remove(id: number) {
    const book = await this.findOne(id);

    const borrowed = await this.loanModel.count({ where: { bookId: id, status: 'BORROWED' } });
    const reserved = await this.reservationModel.count({
      where: { bookId: id, status: { [Op.in]: ['PENDING', 'READY'] } },
    });
    if (borrowed > 0 || reserved > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce livre : ${borrowed} exemplaire(s) en prêt et ${reserved} réservation(s) en cours.`,
      );
    }

    // Historique supprimé avec le livre, dans une seule transaction.
    await this.bookModel.sequelize!.transaction(async (transaction) => {
      await this.loanModel.destroy({ where: { bookId: id }, transaction });
      await this.reservationModel.destroy({ where: { bookId: id }, transaction });
      await book.$set('authors', [], { transaction });
      await book.destroy({ transaction });
    });
    return { message: `Livre ${id} supprimé avec succès.` };
  }

  private async ensureCategoryExists(categoryId: number) {
    const category = await this.categoryModel.findByPk(categoryId);
    if (!category) {
      throw new NotFoundException(`Catégorie ${categoryId} introuvable.`);
    }
    return category;
  }

  private async ensureAuthorsExist(authorIds: number[]) {
    const authors = await this.authorModel.findAll({ where: { id: authorIds } });
    if (authors.length !== authorIds.length) {
      throw new NotFoundException(
        'Un ou plusieurs auteurs fournis sont introuvables.',
      );
    }
    return authors;
  }
}
