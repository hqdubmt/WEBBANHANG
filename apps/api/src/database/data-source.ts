import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'commerce_user',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB || 'ai_commerce',
  entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
});
