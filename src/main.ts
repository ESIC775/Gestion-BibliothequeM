import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { SequelizeExceptionFilter } from "./common/filters/sequelize-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new SequelizeExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Gestion Bibliothèque")
    .setVersion("")
    .addTag("health")
    .addTag("users")
    .addTag("authors")
    .addTag("categories")
    .addTag("books")
    .addTag("loans")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API démarrée sur http://localhost:${port}`);
  console.log(`Swagger disponible sur http://localhost:${port}/docs`);
}

bootstrap();
