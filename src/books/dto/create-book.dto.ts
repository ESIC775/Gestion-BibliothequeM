import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ example: 'Les Misérables' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  title: string;

  @ApiProperty({ example: '978-2070409189' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  isbn: string;

  @ApiProperty({ example: 1862 })
  @IsInt()
  publishedYear: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  totalCopies: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Ignoré : le nombre d’exemplaires disponibles est calculé à partir des prêts et réservations.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableCopies?: number;

  @ApiProperty({ example: 'Roman historique et social.', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  categoryId: number;

  @ApiProperty({ example: [1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  authorIds: number[];
}
