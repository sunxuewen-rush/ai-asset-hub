import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createClient } from './client.js';

// forward-only 迁移执行（R5：drizzle-kit 时间戳版本，只增不改）。
// 注意：db 运维脚本只需 DATABASE_URL，不走全量 env（SESSION_SECRET 等非必要）。
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
const db = createClient(connectionString);
await migrate(db, { migrationsFolder: './drizzle' });
console.log('[db] migrations applied');
await db.$client.end();
