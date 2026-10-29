import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({
    required: false,
    example: '2026-11-12T10:00:00.000Z',
    description: 'Date de retour prévue (par défaut : dans 14 jours, maximum 30 jours).',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 1, description: "Adhérent qui emprunte" })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1, description: 'Livre emprunté' })
  @IsInt()
  bookId: number;
}
