import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class UpdateLoanDto {
  @ApiProperty({ required: false, example: '2026-11-20T10:00:00.000Z', description: 'Nouvelle date de retour prévue' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false, example: 'RETURNED', enum: ['RETURNED'], description: 'Enregistrer le retour du livre' })
  @IsOptional()
  @IsIn(['RETURNED'])
  status?: 'RETURNED';
}
