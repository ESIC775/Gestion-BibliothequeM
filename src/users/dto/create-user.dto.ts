import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, IsIn, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Amina' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Bensaid' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'amina@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: '12 rue des Fleurs, Paris' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  address: string;

  @ApiProperty({ example: '+33601020304' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ required: false, enum: ['ADMIN', 'MEMBER'], example: 'MEMBER' })
  @IsOptional()
  @IsIn(['ADMIN', 'MEMBER'])
  role?: 'ADMIN' | 'MEMBER';
}
