import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Public } from './auth.decorators';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur et génération de JWT' })
  @ApiResponse({ status: 200, description: 'Connexion réussie.' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouvel adhérent (rôle MEMBER)" })
  @ApiResponse({ status: 201, description: 'Compte créé, JWT renvoyé.' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Profil de la personne connectée' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }
}
