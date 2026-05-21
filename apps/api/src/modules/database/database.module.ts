import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

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
          connectionString: config.getOrThrow<string>('ARCHIVE_DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30000,
        }),
    },
    {
      provide: CAMUNDA_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.getOrThrow<string>('CAMUNDA_DATABASE_URL'),
          max: 10,
          idleTimeoutMillis: 30000,
        }),
    },
  ],
  exports: [ARCHIVE_DB, CAMUNDA_DB],
})
export class DatabaseModule {}
