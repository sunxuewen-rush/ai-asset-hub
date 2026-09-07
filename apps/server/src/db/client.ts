import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getEnv } from '../config/env.js';
import * as schema from './schema/index.js';

/** 惰性初始化：连接池首次查询才建立，不阻塞 healthz（T10） */
export function createClient(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
}

export function getDb() {
  return createClient(getEnv().DATABASE_URL);
}

export type Db = ReturnType<typeof getDb>;
