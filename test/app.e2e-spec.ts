import * as request from 'supertest';
import { createTestApp } from './test-app';

describe('Library API (e2e) — flux de base', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('/health est public', async () => {
    const response = await request(ctx.http()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('un bibliothécaire gère un flux complet : catégorie, auteur, livre, prêt, retour', async () => {
    const admin = ctx.as(ctx.admin);
    const member = await ctx.newMember('Nora');

    const category = await admin.post('/categories').send({ name: 'Roman', description: 'Romans' }).expect(201);
    const author = await admin
      .post('/authors')
      .send({ firstName: 'Albert', lastName: 'Camus', bio: 'Auteur français' })
      .expect(201);
    const book = await admin
      .post('/books')
      .send({
        title: "L'Étranger",
        isbn: '978-2070360022',
        publishedYear: 1942,
        totalCopies: 3,
        categoryId: category.body.id,
        authorIds: [author.body.id],
      })
      .expect(201);
    expect(book.body.availableCopies).toBe(3);

    const loan = await admin.post('/loans').send({ userId: member.id, bookId: book.body.id }).expect(201);
    expect(loan.body.status).toBe('BORROWED');
    expect((await admin.get(`/books/${book.body.id}`).expect(200)).body.availableCopies).toBe(2);

    const returned = await admin.patch(`/loans/${loan.body.id}`).send({ status: 'RETURNED' }).expect(200);
    expect(returned.body.status).toBe('RETURNED');
    expect((await admin.get(`/books/${book.body.id}`).expect(200)).body.availableCopies).toBe(3);
  });
});
