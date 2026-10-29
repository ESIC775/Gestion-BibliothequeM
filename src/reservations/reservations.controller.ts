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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';

@ApiBearerAuth()
@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Réserver un livre (mis de côté s’il est disponible, sinon file d’attente)' })
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: AuthUser) {
    return this.reservationsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les réservations (toutes pour un bibliothécaire, les siennes pour un adhérent)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.reservationsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une réservation' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.reservationsService.findOne(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.reservationsService.cancel(id, user);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer définitivement une réservation (bibliothécaire)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }
}
