import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles, CurrentUser, AuthUser } from '../auth/auth.decorators';


@ApiTags('books')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Créer un livre avec sa catégorie et ses auteurs (Many-to-Many)' })
  create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les livres (catalogue)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.booksService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un livre' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.booksService.findOne(id, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un livre' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    return this.booksService.update(id, updateBookDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un livre' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.remove(id);
  }
}
