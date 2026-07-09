import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

function buildConnectionString(config: ConfigService, key: string, containerHost: string, fallbackPort: string) {
  const raw = config.get<string>(key);
  const runInDocker = ['true', '1', 'yes'].includes((config.get<string>('RUN_IN_DOCKER') ?? '').toLowerCase());
  const base = raw ?? `postgresql://user:pass@${runInDocker ? containerHost : 'localhost'}:${fallbackPort}/db`;
  const parsed = new URL(base);

  if (parsed.hostname === containerHost || parsed.hostname === 'archive-db' || parsed.hostname === 'camunda-db') {
    parsed.hostname = runInDocker ? parsed.hostname : 'localhost';
    if (!runInDocker) {
      parsed.port = fallbackPort;
    }
  }

  return parsed.toString();
}

export const ARCHIVE_DB = Symbol('ARCHIVE_DB');
export const CAMUNDA_DB = Symbol('CAMUNDA_DB');

@Global()
@Module({
  providers: [
    {
      provide: ARCHIVE_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: buildConnectionString(config, 'ARCHIVE_DATABASE_URL', 'archive-db', '5433'),
          max: 20,
          idleTimeoutMillis: 30000,
        }),
    },
    {
      provide: CAMUNDA_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: buildConnectionString(config, 'CAMUNDA_DATABASE_URL', 'camunda-db', '5432'),
          max: 10,
          idleTimeoutMillis: 30000,
        }),
    },
  ],
  exports: [ARCHIVE_DB, CAMUNDA_DB],
})
export class DatabaseModule {}
