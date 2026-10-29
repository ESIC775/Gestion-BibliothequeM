import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Reservation } from './models/reservation.model';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Book } from '../books/models/book.model';
import { User } from '../users/models/user.model';
import { Loan } from '../loans/models/loan.model';
import { CirculationService } from '../circulation/circulation.service';
import { LIBRARY_RULES, addDays } from '../circulation/circulation.rules';
import { AuthUser, isAdmin } from '../auth/auth.decorators';

const reservationIncludes = () => [
  { model: User, attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: Book, attributes: ['id', 'title', 'isbn', 'coverUrl', 'availableCopies', 'totalCopies'] },
];

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation) private readonly reservationModel: typeof Reservation,
    @InjectModel(Book) private readonly bookModel: typeof Book,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Loan) private readonly loanModel: typeof Loan,
    private readonly circulation: CirculationService,
  ) {}

  /**
   * Réserver un livre :
   *  - s'il reste un exemplaire, il est mis de côté au comptoir (READY, 3 jours pour venir le chercher) ;
   *  - sinon l'adhérent entre dans la file d'attente (PENDING).
   */
  async create(dto: CreateReservationDto, actor: AuthUser) {
    await this.circulation.expireStale();

    // Un adhérent ne peut réserver que pour lui ; le bibliothécaire choisit l'adhérent.
    const userId = isAdmin(actor) ? dto.userId : actor.userId;
    if (!userId) throw new BadRequestException("Précisez l'adhérent (userId).");

    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const book = await this.bookModel.findByPk(dto.bookId);
    if (!book) throw new NotFoundException('Livre introuvable');

    if (await this.circulation.hasOverdueLoan(userId)) {
      throw new BadRequestException(
        'Un livre est en retard : il doit être rendu avant de pouvoir réserver.',
      );
    }
    if ((await this.circulation.activeReservationCount(userId)) >= LIBRARY_RULES.MAX_ACTIVE_RESERVATIONS) {
      throw new BadRequestException(
        `Limite atteinte : ${LIBRARY_RULES.MAX_ACTIVE_RESERVATIONS} réservations maximum en même temps.`,
      );
    }
    const duplicate = await this.reservationModel.count({
      where: { userId, bookId: book.id, status: { [Op.in]: ['PENDING', 'READY'] } },
    });
    if (duplicate > 0) {
      throw new BadRequestException('Une réservation est déjà en cours pour ce livre.');
    }
    const alreadyBorrowed = await this.loanModel.count({
      where: { userId, bookId: book.id, status: 'BORROWED' },
    });
    if (alreadyBorrowed > 0) {
      throw new BadRequestException('Ce livre est déjà emprunté par cet adhérent.');
    }

    const held = await this.circulation.takeCopy(book.id);
    const reservation = await this.reservationModel.create({
      userId,
      bookId: book.id,
      reservedAt: new Date(),
      status: held ? 'READY' : 'PENDING',
      expiresAt: held ? addDays(new Date(), LIBRARY_RULES.HOLD_DAYS) : null,
    } as any);

    return this.findOne(reservation.id);
  }

  async findAll(actor: AuthUser) {
    await this.circulation.expireStale();
    const rows = await this.reservationModel.findAll({
      where: isAdmin(actor) ? {} : { userId: actor.userId },
      include: reservationIncludes(),
      order: [['id', 'DESC']],
    });
    return this.withQueuePosition(rows);
  }

  async findOne(id: number, actor?: AuthUser) {
    const reservation = await this.reservationModel.findByPk(id, {
      include: reservationIncludes(),
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (actor && !isAdmin(actor) && reservation.userId !== actor.userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }
    const [withQueue] = await this.withQueuePosition([reservation]);
    return withQueue;
  }

  async cancel(id: number, actor: AuthUser) {
    const reservation = await this.reservationModel.findByPk(id);
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    if (!isAdmin(actor) && reservation.userId !== actor.userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas.');
    }
    if (reservation.status !== 'PENDING' && reservation.status !== 'READY') {
      throw new BadRequestException('Cette réservation n’est plus active.');
    }

    const wasReady = reservation.status === 'READY';
    await reservation.update({ status: 'CANCELLED', expiresAt: null });
    // L'exemplaire mis de côté repart vers le suivant dans la file, ou sur l'étagère.
    if (wasReady) await this.circulation.releaseCopy(reservation.bookId);
    return { message: 'Réservation annulée avec succès' };
  }

  async remove(id: number) {
    const reservation = await this.reservationModel.findByPk(id);
    if (!reservation) throw new NotFoundException('Réservation introuvable');
    const wasReady = reservation.status === 'READY';
    await reservation.destroy();
    if (wasReady) await this.circulation.releaseCopy(reservation.bookId);
    return { message: 'Réservation supprimée définitivement' };
  }

  /** Ajoute `queuePosition` (1 = prochain servi) aux réservations en attente. */
  private async withQueuePosition(rows: Reservation[]) {
    const bookIds = [...new Set(rows.filter((r) => r.status === 'PENDING').map((r) => r.bookId))];
    const pending = bookIds.length
      ? await this.reservationModel.findAll({
          where: { bookId: { [Op.in]: bookIds }, status: 'PENDING' },
          attributes: ['id', 'bookId'],
          order: [['reservedAt', 'ASC'], ['id', 'ASC']],
        })
      : [];
    return rows.map((row) => {
      const json: any = row.toJSON();
      if (row.status === 'PENDING') {
        json.queuePosition =
          pending.filter((p) => p.bookId === row.bookId).findIndex((p) => p.id === row.id) + 1;
      }
      return json;
    });
  }
}
