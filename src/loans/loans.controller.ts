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
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { AuthUser, CurrentUser, Roles } from '../auth/auth.decorators';

@ApiBearerAuth()
@ApiTags('loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Enregistrer un prêt au comptoir (bibliothécaire)' })
  create(@Body() createLoanDto: CreateLoanDto) {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les prêts (tous pour un bibliothécaire, les siens pour un adhérent)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.loansService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un prêt' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.loansService.findOne(id, user);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Enregistrer le retour ou prolonger la date (bibliothécaire)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLoanDto: UpdateLoanDto) {
    return this.loansService.update(id, updateLoanDto);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renouveler un prêt de 14 jours (2 fois maximum, pas si en retard ou réservé)' })
  renew(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.loansService.renew(id, user);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un prêt (bibliothécaire)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.loansService.remove(id);
  }
}
