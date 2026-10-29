import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Vérifier que l'API est disponible" })
  check() {
    return {
      status: 'ok',
      service: 'library-api',
      timestamp: new Date().toISOString(),
    };
  }
}
