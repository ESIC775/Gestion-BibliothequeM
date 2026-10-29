import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/sequelize';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { SequelizeExceptionFilter } from '../src/common/filters/sequelize-exception.filter';

/** Démarre l'application complète (guards réels) sur une base SQLite en mémoire. */
export async function createTestApp() {
  process.env.NODE_ENV = 'test';
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require('../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new SequelizeExceptionFilter());
  await app.init();

  const model = (cls: any) => app.get(getModelToken(cls));
  const http = () => app.getHttpServer();

  // Un bibliothécaire est créé directement en base (l'inscription ne crée que des adhérents).
  const { User } = require('../src/users/models/user.model');
  await model(User).create({
    firstName: 'Admin',
    lastName: 'Biblio',
    email: 'admin@test.fr',
    password: await bcrypt.hash('admin123', 10),
    role: 'ADMIN',
  });
  const login = await request(http())
    .post('/auth/login')
    .send({ email: 'admin@test.fr', password: 'admin123' })
    .expect(200);
  const admin = { token: login.body.access_token as string, id: login.body.user.id as number };

  let counter = 0;
  /** Inscrit un nouvel adhérent et renvoie son token. */
  const newMember = async (name = 'Membre') => {
    counter += 1;
    const res = await request(http())
      .post('/auth/register')
      .send({
        firstName: name,
        lastName: `N${counter}`,
        email: `membre${counter}@test.fr`,
        password: 'secret123',
      })
      .expect(201);
    return { token: res.body.access_token as string, id: res.body.user.id as number };
  };

  const as = (who: { token: string }) => ({
    get: (url: string) => request(http()).get(url).set('Authorization', `Bearer ${who.token}`),
    post: (url: string) => request(http()).post(url).set('Authorization', `Bearer ${who.token}`),
    patch: (url: string) => request(http()).patch(url).set('Authorization', `Bearer ${who.token}`),
    delete: (url: string) => request(http()).delete(url).set('Authorization', `Bearer ${who.token}`),
  });

  return { app, http, model, admin, newMember, as };
}
