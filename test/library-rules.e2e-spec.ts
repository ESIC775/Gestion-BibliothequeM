import { Op } from 'sequelize';
import * as request from 'supertest';
import { createTestApp } from './test-app';

const DAY = 24 * 60 * 60 * 1000;

describe('Règles de la bibliothèque (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let admin: ReturnType<typeof ctx.as>;
  let categoryId: number;
  let authorId: number;
  let isbnCounter = 0;

  const Loan = () => ctx.model(require('../src/loans/models/loan.model').Loan);
  const Reservation = () => ctx.model(require('../src/reservations/models/reservation.model').Reservation);

  const createBook = async (title: string, totalCopies: number) => {
    isbnCounter += 1;
    const res = await admin
      .post('/books')
      .send({
        title,
        isbn: `978-0-000-${String(isbnCounter).padStart(5, '0')}`,
        publishedYear: 2020,
        totalCopies,
        categoryId,
        authorIds: [authorId],
      })
      .expect(201);
    return res.body.id as number;
  };
  const copies = async (bookId: number) =>
    (await admin.get(`/books/${bookId}`).expect(200)).body.availableCopies as number;
  const lend = (userId: number, bookId: number) => admin.post('/loans').send({ userId, bookId });
  const giveBack = (loanId: number) => admin.patch(`/loans/${loanId}`).send({ status: 'RETURNED' });

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = ctx.as(ctx.admin);
    categoryId = (await admin.post('/categories').send({ name: 'Roman', description: 'Romans' }).expect(201)).body.id;
    authorId = (
      await admin.post('/authors').send({ firstName: 'Victor', lastName: 'Hugo', bio: 'Auteur' }).expect(201)
    ).body.id;
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('Authentification et droits', () => {
    it('refuse les routes sans token, sauf health / login / register', async () => {
      await request(ctx.http()).get('/books').expect(401);
      await request(ctx.http()).get('/loans').expect(401);
      await request(ctx.http()).post('/reservations').send({ bookId: 1 }).expect(401);
      await request(ctx.http()).get('/health').expect(200);
    });

    it("l'inscription crée un MEMBER, refuse les doublons et les mots de passe trop courts", async () => {
      const res = await request(ctx.http())
        .post('/auth/register')
        .send({ firstName: 'Sarah', lastName: 'Martin', email: 'sarah@test.fr', password: 'abcdef' })
        .expect(201);
      expect(res.body.user.role).toBe('MEMBER');
      expect(res.body.access_token).toBeDefined();
      await request(ctx.http())
        .post('/auth/register')
        .send({ firstName: 'Sarah', lastName: 'Bis', email: 'sarah@test.fr', password: 'abcdef' })
        .expect(409);
      await request(ctx.http())
        .post('/auth/register')
        .send({ firstName: 'A', lastName: 'B', email: 'court@test.fr', password: '123' })
        .expect(400);
      // On ne peut pas s'auto-attribuer le rôle ADMIN à l'inscription.
      await request(ctx.http())
        .post('/auth/register')
        .send({ firstName: 'A', lastName: 'B', email: 'hack@test.fr', password: 'abcdef', role: 'ADMIN' })
        .expect(400);
    });

    it("l'inscription peut être limitée au domaine d'email de l'école", async () => {
      process.env.ALLOWED_EMAIL_DOMAIN = 'etu.ecole.fr, ecole.fr';
      try {
        const refused = await request(ctx.http())
          .post('/auth/register')
          .send({ firstName: 'Ext', lastName: 'Erne', email: 'ext@gmail.com', password: 'abcdef' })
          .expect(400);
        expect(refused.body.message).toContain('@etu.ecole.fr');
        // faux domaine qui se termine pareil : refusé
        await request(ctx.http())
          .post('/auth/register')
          .send({ firstName: 'Ext', lastName: 'Erne', email: 'x@fauxecole.fr', password: 'abcdef' })
          .expect(400);
        await request(ctx.http())
          .post('/auth/register')
          .send({ firstName: 'Léa', lastName: 'Etu', email: 'Lea@ETU.ECOLE.FR', password: 'abcdef' })
          .expect(201);
        // sous-domaine accepté
        await request(ctx.http())
          .post('/auth/register')
          .send({ firstName: 'Max', lastName: 'Sub', email: 'max@info.ecole.fr', password: 'abcdef' })
          .expect(201);
        // un bibliothécaire peut toujours créer un compte hors domaine
        await admin
          .post('/users')
          .send({ firstName: 'Inv', lastName: 'Ite', email: 'invite@gmail.com', password: 'abcdef', address: 'a', phone: '1' })
          .expect(201);
      } finally {
        delete process.env.ALLOWED_EMAIL_DOMAIN;
      }
      await request(ctx.http())
        .post('/auth/register')
        .send({ firstName: 'Libre', lastName: 'Ok', email: 'libre@gmail.com', password: 'abcdef' })
        .expect(201); // sans restriction : libre à nouveau
    });

    it('login : mauvais mot de passe refusé, bon mot de passe accepté, /auth/me', async () => {
      await request(ctx.http()).post('/auth/login').send({ email: 'sarah@test.fr', password: 'mauvais-mot-de-passe' }).expect(401);
      const ok = await request(ctx.http())
        .post('/auth/login')
        .send({ email: 'sarah@test.fr', password: 'abcdef' })
        .expect(200);
      const me = await ctx.as({ token: ok.body.access_token }).get('/auth/me').expect(200);
      expect(me.body.email).toBe('sarah@test.fr');
      expect(me.body.password).toBeUndefined();
    });

    it("un adhérent ne peut pas gérer le catalogue, les comptes ni les prêts", async () => {
      const m = ctx.as(await ctx.newMember());
      const bookId = await createBook('Droits', 1);
      await m.post('/books').send({}).expect(403);
      await m.patch(`/books/${bookId}`).send({ title: 'Piraté' }).expect(403);
      await m.delete(`/books/${bookId}`).expect(403);
      await m.post('/authors').send({}).expect(403);
      await m.post('/categories').send({}).expect(403);
      await m.get('/users').expect(403);
      await m.post('/loans').send({ userId: 1, bookId }).expect(403);
      // mais il peut consulter le catalogue
      await m.get('/books').expect(200);
      await m.get('/authors').expect(200);
    });

    it("les mots de passe (hash) ne sont jamais renvoyés par l'API", async () => {
      const users = await admin.get('/users').expect(200);
      expect(users.body.length).toBeGreaterThan(0);
      expect(JSON.stringify(users.body)).not.toContain('password');
      const loans = await admin.get('/loans').expect(200);
      expect(JSON.stringify(loans.body)).not.toContain('$2b$');
    });

    it("un adhérent ne voit pas qui a emprunté un livre", async () => {
      const member = await ctx.newMember();
      const bookId = await createBook('Confidentiel', 2);
      await lend(member.id, bookId).expect(201);
      const asMember = await ctx.as(member).get(`/books/${bookId}`).expect(200);
      expect(asMember.body.loans).toBeUndefined();
      const asAdmin = await admin.get(`/books/${bookId}`).expect(200);
      expect(asAdmin.body.loans).toHaveLength(1);
    });
  });

  describe('Prêts', () => {
    it('durée par défaut 14 jours, stock décrémenté, pas deux fois le même livre', async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Prêt simple', 2);
      const loan = await lend(m.id, bookId).expect(201);
      const days = (new Date(loan.body.dueDate).getTime() - Date.now()) / DAY;
      expect(days).toBeGreaterThan(13.9);
      expect(days).toBeLessThan(14.1);
      expect(await copies(bookId)).toBe(1);
      await lend(m.id, bookId).expect(400); // déjà emprunté par ce membre
      expect(await copies(bookId)).toBe(1);
    });

    it('refuse une date de retour passée ou au-delà de 30 jours', async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Dates', 3);
      const past = new Date(Date.now() - DAY).toISOString();
      const far = new Date(Date.now() + 60 * DAY).toISOString();
      await admin.post('/loans').send({ userId: m.id, bookId, dueDate: past }).expect(400);
      await admin.post('/loans').send({ userId: m.id, bookId, dueDate: far }).expect(400);
      expect(await copies(bookId)).toBe(3);
    });

    it('limite à 3 livres en même temps', async () => {
      const m = await ctx.newMember();
      const ids = [await createBook('L1', 1), await createBook('L2', 1), await createBook('L3', 1), await createBook('L4', 1)];
      for (const id of ids.slice(0, 3)) await lend(m.id, id).expect(201);
      const refused = await lend(m.id, ids[3]).expect(400);
      expect(refused.body.message).toContain('3 livres');
      expect(await copies(ids[3])).toBe(1);
    });

    it("refuse le prêt quand il n'y a plus d'exemplaire", async () => {
      const a = await ctx.newMember();
      const b = await ctx.newMember();
      const bookId = await createBook('Unique', 1);
      await lend(a.id, bookId).expect(201);
      await lend(b.id, bookId).expect(400);
      expect(await copies(bookId)).toBe(0);
    });

    it('un adhérent ne voit que ses propres prêts', async () => {
      const a = await ctx.newMember();
      const b = await ctx.newMember();
      const bookId = await createBook('Privé', 2);
      const loan = await lend(a.id, bookId).expect(201);
      const mine = await ctx.as(a).get('/loans').expect(200);
      expect(mine.body.map((l: any) => l.id)).toContain(loan.body.id);
      const theirs = await ctx.as(b).get('/loans').expect(200);
      expect(theirs.body.map((l: any) => l.id)).not.toContain(loan.body.id);
      await ctx.as(b).get(`/loans/${loan.body.id}`).expect(403);
    });

    it("le retour remet l'exemplaire en rayon et on ne peut pas rendre deux fois", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Retour', 1);
      const loan = await lend(m.id, bookId).expect(201);
      expect(await copies(bookId)).toBe(0);
      const back = await giveBack(loan.body.id).expect(200);
      expect(back.body.returnedAt).toBeTruthy();
      expect(await copies(bookId)).toBe(1);
      await giveBack(loan.body.id).expect(400);
      expect(await copies(bookId)).toBe(1);
    });
  });

  describe('Retards et amendes', () => {
    it("un retard bloque emprunts, réservations et renouvellements ; l'amende est calculée", async () => {
      const m = await ctx.newMember();
      const late = await createBook('En retard', 1);
      const other = await createBook('Autre', 2);
      const loan = await lend(m.id, late).expect(201);
      await Loan().update({ dueDate: new Date(Date.now() - 4.5 * DAY) }, { where: { id: loan.body.id } });

      const list = await ctx.as(m).get('/loans').expect(200);
      const mine = list.body.find((l: any) => l.id === loan.body.id);
      expect(mine.overdue).toBe(true);
      expect(mine.daysLate).toBe(5);
      expect(mine.fine).toBeCloseTo(1.0, 2);

      await lend(m.id, other).expect(400);
      await ctx.as(m).post('/reservations').send({ bookId: other }).expect(400);
      await ctx.as(m).post(`/loans/${loan.body.id}/renew`).expect(400);

      await giveBack(loan.body.id).expect(200);
      await lend(m.id, other).expect(201); // plus de retard : à nouveau possible
    });
  });

  describe('Renouvellement', () => {
    it('+14 jours, 2 fois maximum, seulement pour son propre prêt', async () => {
      const m = await ctx.newMember();
      const other = await ctx.newMember();
      const bookId = await createBook('Renouvelable', 2);
      const loan = await lend(m.id, bookId).expect(201);
      const firstDue = new Date(loan.body.dueDate).getTime();

      await ctx.as(other).post(`/loans/${loan.body.id}/renew`).expect(403);

      const r1 = await ctx.as(m).post(`/loans/${loan.body.id}/renew`).expect(201);
      expect(new Date(r1.body.dueDate).getTime() - firstDue).toBe(14 * DAY);
      expect(r1.body.renewals).toBe(1);
      await ctx.as(m).post(`/loans/${loan.body.id}/renew`).expect(201);
      const r3 = await ctx.as(m).post(`/loans/${loan.body.id}/renew`).expect(400);
      expect(r3.body.message).toContain('limite');
    });

    it("est refusé quand un autre adhérent a réservé le livre", async () => {
      const holder = await ctx.newMember();
      const waiting = await ctx.newMember();
      const bookId = await createBook('Demandé', 1);
      const loan = await lend(holder.id, bookId).expect(201);
      await ctx.as(waiting).post('/reservations').send({ bookId }).expect(201);
      const refused = await ctx.as(holder).post(`/loans/${loan.body.id}/renew`).expect(400);
      expect(refused.body.message).toContain('réservé');
    });
  });

  describe('Réservations', () => {
    it("livre disponible : l'exemplaire est mis de côté (READY, 3 jours)", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Mis de côté', 2);
      const res = await ctx.as(m).post('/reservations').send({ bookId }).expect(201);
      expect(res.body.status).toBe('READY');
      const days = (new Date(res.body.expiresAt).getTime() - Date.now()) / DAY;
      expect(days).toBeGreaterThan(2.9);
      expect(days).toBeLessThan(3.1);
      expect(await copies(bookId)).toBe(1);
    });

    it("un adhérent réserve toujours pour lui-même, même s'il indique un autre userId", async () => {
      const m = await ctx.newMember();
      const victim = await ctx.newMember();
      const bookId = await createBook('Usurpation', 2);
      const res = await ctx.as(m).post('/reservations').send({ bookId, userId: victim.id }).expect(201);
      expect(res.body.userId).toBe(m.id);
    });

    it('pas de doublon, pas de réservation de ce qu\'on a déjà emprunté, 3 réservations maximum', async () => {
      const m = await ctx.newMember();
      const a = await createBook('R-A', 3);
      const b = await createBook('R-B', 3);
      const c = await createBook('R-C', 3);
      const d = await createBook('R-D', 3);
      await ctx.as(m).post('/reservations').send({ bookId: a }).expect(201);
      await ctx.as(m).post('/reservations').send({ bookId: a }).expect(400);
      await lend(m.id, b).expect(201);
      await ctx.as(m).post('/reservations').send({ bookId: b }).expect(400);
      await ctx.as(m).post('/reservations').send({ bookId: c }).expect(201);
      await ctx.as(m).post('/reservations').send({ bookId: d }).expect(201);
      const extra = await createBook('R-E', 3);
      await ctx.as(m).post('/reservations').send({ bookId: extra }).expect(400);
    });

    it("livre indisponible : file d'attente, puis passage en READY au retour, puis retrait au comptoir", async () => {
      const holder = await ctx.newMember();
      const first = await ctx.newMember();
      const second = await ctx.newMember();
      const bookId = await createBook('File', 1);

      const loan = await lend(holder.id, bookId).expect(201);
      const r1 = await ctx.as(first).post('/reservations').send({ bookId }).expect(201);
      const r2 = await ctx.as(second).post('/reservations').send({ bookId }).expect(201);
      expect(r1.body.status).toBe('PENDING');
      expect(r1.body.queuePosition).toBe(1);
      expect(r2.body.queuePosition).toBe(2);

      await giveBack(loan.body.id).expect(200);
      // l'exemplaire est gardé pour le premier de la file, pas remis en rayon
      expect(await copies(bookId)).toBe(0);
      const mine = await ctx.as(first).get('/reservations').expect(200);
      expect(mine.body.find((r: any) => r.id === r1.body.id).status).toBe('READY');
      const theirs = await ctx.as(second).get('/reservations').expect(200);
      const second1 = theirs.body.find((r: any) => r.id === r2.body.id);
      expect(second1.status).toBe('PENDING');
      expect(second1.queuePosition).toBe(1);

      // le deuxième ne peut pas "doubler" au comptoir
      await lend(second.id, bookId).expect(400);
      // le premier retire son livre
      await lend(first.id, bookId).expect(201);
      const after = await ctx.as(first).get('/reservations').expect(200);
      expect(after.body.find((r: any) => r.id === r1.body.id).status).toBe('COMPLETED');
      expect(await copies(bookId)).toBe(0);
    });

    it("annuler une réservation prête passe l'exemplaire au suivant, ou le remet en rayon", async () => {
      const holder = await ctx.newMember();
      const a = await ctx.newMember();
      const b = await ctx.newMember();
      const bookId = await createBook('Annulation', 1);
      const loan = await lend(holder.id, bookId).expect(201);
      const ra = await ctx.as(a).post('/reservations').send({ bookId }).expect(201);
      const rb = await ctx.as(b).post('/reservations').send({ bookId }).expect(201);
      await giveBack(loan.body.id).expect(200); // a est READY
      await ctx.as(a).patch(`/reservations/${ra.body.id}/cancel`).expect(200);
      const bList = await ctx.as(b).get('/reservations').expect(200);
      expect(bList.body.find((r: any) => r.id === rb.body.id).status).toBe('READY'); // b passe devant
      expect(await copies(bookId)).toBe(0);
      await ctx.as(b).patch(`/reservations/${rb.body.id}/cancel`).expect(200);
      expect(await copies(bookId)).toBe(1); // plus personne : retour en rayon
      await ctx.as(b).patch(`/reservations/${rb.body.id}/cancel`).expect(400); // déjà annulée
    });

    it("annuler une réservation en attente ne touche pas au stock", async () => {
      const holder = await ctx.newMember();
      const a = await ctx.newMember();
      const bookId = await createBook('Attente', 1);
      await lend(holder.id, bookId).expect(201);
      const r = await ctx.as(a).post('/reservations').send({ bookId }).expect(201);
      await ctx.as(a).patch(`/reservations/${r.body.id}/cancel`).expect(200);
      expect(await copies(bookId)).toBe(0);
    });

    it("un adhérent ne peut annuler que ses réservations et ne peut pas les supprimer", async () => {
      const a = await ctx.newMember();
      const b = await ctx.newMember();
      const bookId = await createBook('Propriété', 2);
      const r = await ctx.as(a).post('/reservations').send({ bookId }).expect(201);
      await ctx.as(b).patch(`/reservations/${r.body.id}/cancel`).expect(403);
      await ctx.as(a).delete(`/reservations/${r.body.id}`).expect(403);
      const all = await ctx.as(b).get('/reservations').expect(200);
      expect(all.body.map((x: any) => x.id)).not.toContain(r.body.id);
    });

    it("une réservation non retirée à temps expire et libère l'exemplaire", async () => {
      const a = await ctx.newMember();
      const bookId = await createBook('Expiration', 1);
      const r = await ctx.as(a).post('/reservations').send({ bookId }).expect(201);
      expect(await copies(bookId)).toBe(0);
      await Reservation().update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: r.body.id } });
      expect(await copies(bookId)).toBe(1); // la consultation du catalogue déclenche l'expiration
      const list = await ctx.as(a).get('/reservations').expect(200);
      expect(list.body.find((x: any) => x.id === r.body.id).status).toBe('EXPIRED');
    });

    it("l'expiration donne l'exemplaire au suivant de la file", async () => {
      const holder = await ctx.newMember();
      const a = await ctx.newMember();
      const b = await ctx.newMember();
      const bookId = await createBook('Expire-suivant', 1);
      const loan = await lend(holder.id, bookId).expect(201);
      const ra = await ctx.as(a).post('/reservations').send({ bookId }).expect(201);
      const rb = await ctx.as(b).post('/reservations').send({ bookId }).expect(201);
      await giveBack(loan.body.id).expect(200);
      await Reservation().update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: ra.body.id } });
      await admin.get('/books').expect(200); // déclenche l'expiration
      const bList = await ctx.as(b).get('/reservations').expect(200);
      expect(bList.body.find((x: any) => x.id === rb.body.id).status).toBe('READY');
      expect(await copies(bookId)).toBe(0);
    });
  });

  describe('Protection des données', () => {
    it("on ne peut pas supprimer un livre prêté ou réservé", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Protégé', 2);
      const loan = await lend(m.id, bookId).expect(201);
      await admin.delete(`/books/${bookId}`).expect(409);
      await giveBack(loan.body.id).expect(200);
      const res = await ctx.as(m).post('/reservations').send({ bookId }).expect(201);
      await admin.delete(`/books/${bookId}`).expect(409);
      await ctx.as(m).patch(`/reservations/${res.body.id}/cancel`).expect(200);
      await admin.delete(`/books/${bookId}`).expect(200);
    });

    it("on ne peut pas supprimer un adhérent qui a un livre, ni soi-même", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Membre', 1);
      const loan = await lend(m.id, bookId).expect(201);
      await admin.delete(`/users/${m.id}`).expect(409);
      await admin.delete(`/users/${ctx.admin.id}`).expect(409);
      await giveBack(loan.body.id).expect(200);
      await admin.delete(`/users/${m.id}`).expect(200);
    });

    it("supprimer un adhérent annule ses réservations et libère les exemplaires", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Départ', 1);
      await ctx.as(m).post('/reservations').send({ bookId }).expect(201);
      expect(await copies(bookId)).toBe(0);
      await admin.delete(`/users/${m.id}`).expect(200);
      expect(await copies(bookId)).toBe(1);
    });

    it("le total d'exemplaires suit le stock et ne peut pas descendre sous les exemplaires dehors", async () => {
      const m = await ctx.newMember();
      const bookId = await createBook('Stock', 3);
      await lend(m.id, bookId).expect(201); // 2 dispo / 3
      await admin.patch(`/books/${bookId}`).send({ totalCopies: 5 }).expect(200);
      expect(await copies(bookId)).toBe(4);
      await admin.patch(`/books/${bookId}`).send({ totalCopies: 0 }).expect(400);
      await admin.patch(`/books/${bookId}`).send({ totalCopies: 1 }).expect(200);
      expect(await copies(bookId)).toBe(0);
      await admin.patch(`/books/${bookId}`).send({ totalCopies: -1 }).expect(400);
    });
  });

  it('invariant final : disponibles + prêtés + mis de côté = total pour chaque livre', async () => {
    const books = (await admin.get('/books').expect(200)).body;
    const loans = await Loan().findAll({ where: { status: 'BORROWED' } });
    const holds = await Reservation().findAll({ where: { status: 'READY' } });
    for (const book of books) {
      const out = loans.filter((l: any) => l.bookId === book.id).length;
      const held = holds.filter((r: any) => r.bookId === book.id).length;
      expect({ id: book.id, sum: book.availableCopies + out + held }).toEqual({ id: book.id, sum: book.totalCopies });
    }
    expect(books.length).toBeGreaterThan(10);
    expect(Op).toBeDefined();
  });
});
