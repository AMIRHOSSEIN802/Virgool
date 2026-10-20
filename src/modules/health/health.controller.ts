import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Liveness: the process is up and serving. No dependency checks and no
   * sensitive data — safe for load-balancer probes and public monitoring.
   */
  @Get()
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness: the database answers `SELECT 1`. A failure yields 503 with a
   * generic message — never the underlying error, stack trace, or
   * connection details.
   */
  @Get('ready')
  async readiness(): Promise<{ status: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
  }
}
