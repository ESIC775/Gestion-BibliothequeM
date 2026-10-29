import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Sarah' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Martin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'sarah.martin@etu.univ.fr' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: 'monMotDePasse', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' })
  @MaxLength(100)
  password: string;

  @ApiProperty({ required: false, example: '12 rue des Étudiants, Lyon' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  address?: string;

  @ApiProperty({ required: false, example: '+33601020304' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
