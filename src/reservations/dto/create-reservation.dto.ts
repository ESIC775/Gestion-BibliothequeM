import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    required: false,
    example: 4,
    description: "Adhérent concerné (ignoré pour un adhérent : il réserve toujours pour lui-même)",
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({ example: 1, description: 'ID du livre à réserver' })
  @IsInt()
  @IsNotEmpty()
  bookId: number;
}
