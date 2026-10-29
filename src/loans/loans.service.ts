import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Loan } from './models/loan.model';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { User } from '../users/models/user.model';
import { Book } from '../books/models/book.model';
import { Category } from '../categories/models/category.model';
import { Author } from '../authors/models/author.model';
import { Reservation } from '../reservations/models/reservation.model';
import { CirculationService } from '../circulation/circulation.service';
import { LIBRARY_RULES, addDays, DAY_MS } from '../circulation/circulation.rules';
import { AuthUser, isAdmin } from '../auth/auth.decorators';

const loanIncludes = () => [
  { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Book, include: [Category, Author] },
];

@Injectable()
export class LoansService {
  constructor(
    @InjectModel(Loan) private readonly loanModel: typeof Loan,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Book) private readonly bookModel: typeof Book,
    @InjectModel(Reservation) private readonly reservationModel: typeof Reservation,
    private readonly circulation: CirculationService,
  ) {}

  /** Prêt enregistré au comptoir par un bibliothécaire. */
  async create(dto: CreateLoanDto) {
    await this.circulation.expireStale();

    const user = await this.userModel.findByPk(dto.userId);
    if (!user) throw new NotFoundException(`Utilisateur ${dto.userId} introuvable.`);
    const book = await this.bookModel.findByPk(dto.bookId);
    if (!book) throw new NotFoundException(`Livre ${dto.bookId} introuvable.`);

    if (await this.circulation.hasOverdueLoan(user.id)) {
      throw new BadRequestException(
        'Ce membre a un livre en retard : il doit le rendre avant de pouvoir emprunter.',
      );
    }
    if ((await this.circulation.activeLoanCount(user.id)) >= LIBRARY_RULES.MAX_ACTIVE_LOANS) {
      throw new BadRequestException(
        `Limite atteinte : ${LIBRARY_RULES.MAX_ACTIVE_LOANS} livres maximum en même temps.`,
      );
    }
    const alreadyBorrowed = await this.loanModel.count({
      where: { userId: user.id, bookId: book.id, status: 'BORROWED' },
    });
    if (alreadyBorrowed > 0) {
      throw new BadRequestException('Ce membre a déjà emprunté ce livre.');
    }

    const now = new Date();
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : addDays(now, LIBRARY_RULES.LOAN_DAYS);
    if (dueDate.getTime() <= now.getTime()) {
      throw new BadRequestException('La date de retour doit être dans le futur.');
    }
    if (dueDate.getTime() > now.getTime() + LIBRARY_RULES.MAX_LOAN_DAYS * DAY_MS) {
      throw new BadRequestException(
        `La durée d'un prêt ne peut pas dépasser ${LIBRARY_RULES.MAX_LOAN_DAYS} jours.`,
      );
    }

    // Si le membre avait réservé ce livre, l'exemplaire mis de côté lui revient.
    const hold = await this.reservationModel.findOne({
      where: { userId: user.id, bookId: book.id, status: 'READY' },
    });
    if (hold) {
      await hold.update({ status: 'COMPLETED' });
    } else if (!(await this.circulation.takeCopy(book.id))) {
      throw new BadRequestException('Aucun exemplaire disponible pour ce livre.');
    }

    // Une réservation encore en file d'attente pour ce même livre n'a plus d'objet.
    await this.reservationModel.update(
      { status: 'COMPLETED' },
      { where: { userId: user.id, bookId: book.id, status: 'PENDING' } },
    );

    const loan = await this.loanModel.create({
      dueDate,
      userId: user.id,
      bookId: book.id,
      borrowedAt: now,
      status: 'BORROWED',
    });
    return this.findOne(loan.id);
  }

  /** Un bibliothécaire voit tous les prêts ; un adhérent seulement les siens. */
  async findAll(user: AuthUser) {
    return this.loanModel.findAll({
      where: isAdmin(user) ? {} : { userId: user.userId },
      include: loanIncludes(),
      order: [['id', 'ASC']],
    });
  }

  async findOne(id: number, user?: AuthUser) {
    const loan = await this.loanModel.findByPk(id, { include: loanIncludes() });
    if (!loan) throw new NotFoundException(`Emprunt ${id} introuvable.`);
    if (user && !isAdmin(user) && loan.userId !== user.userId) {
      throw new ForbiddenException('Ce prêt ne vous appartient pas.');
    }
    return loan;
  }

  /** Retour du livre et/ou prolongation de la date par un bibliothécaire. */
  async update(id: number, dto: UpdateLoanDto) {
    const loan = await this.loanModel.findByPk(id);
    if (!loan) throw new NotFoundException(`Emprunt ${id} introuvable.`);

    if (loan.status === 'RETURNED') {
      throw new BadRequestException('Ce livre a déjà été rendu.');
    }

    if (dto.dueDate) {
      const dueDate = new Date(dto.dueDate);
      if (dueDate.getTime() <= new Date(loan.borrowedAt).getTime()) {
        throw new BadRequestException("La date de retour doit être après la date d'emprunt.");
      }
      await loan.update({ dueDate });
    }

    if (dto.status === 'RETURNED') {
      await loan.update({ status: 'RETURNED', returnedAt: new Date() });
      await this.circulation.releaseCopy(loan.bookId);
    }

    return this.findOne(id);
  }

  /** Renouvellement : l'adhérent (ou le bibliothécaire) prolonge le prêt de 14 jours. */
  async renew(id: number, user: AuthUser) {
    const loan = await this.findOne(id, user);

    if (loan.status !== 'BORROWED') {
      throw new BadRequestException('Ce livre a déjà été rendu.');
    }
    if (loan.overdue) {
      throw new BadRequestException(
        'Ce prêt est en retard : le livre doit être rapporté, il ne peut plus être renouvelé.',
      );
    }
    if (loan.renewals >= LIBRARY_RULES.MAX_RENEWALS) {
      throw new BadRequestException(
        `Vous avez atteint la limite de ${LIBRARY_RULES.MAX_RENEWALS} renouvellements.`,
      );
    }
    const waiting = await this.reservationModel.count({
      where: {
        bookId: loan.bookId,
        userId: { [Op.ne]: loan.userId },
        status: { [Op.in]: ['PENDING', 'READY'] },
      },
    });
    if (waiting > 0) {
      throw new BadRequestException(
        "Ce livre est réservé par un autre adhérent : il ne peut pas être renouvelé.",
      );
    }

    await loan.update({
      dueDate: addDays(new Date(loan.dueDate), LIBRARY_RULES.RENEWAL_DAYS),
      renewals: loan.renewals + 1,
    });
    return this.findOne(id, user);
  }

  async remove(id: number) {
    const loan = await this.loanModel.findByPk(id);
    if (!loan) throw new NotFoundException(`Emprunt ${id} introuvable.`);

    const wasBorrowed = loan.status === 'BORROWED';
    await loan.destroy();
    if (wasBorrowed) await this.circulation.releaseCopy(loan.bookId);
    return { message: `Emprunt ${id} supprimé avec succès.` };
  }
}
