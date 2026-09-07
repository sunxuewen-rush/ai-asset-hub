import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './client.js';

// forward-only 迁移执行（R5：drizzle-kit 时间戳版本，只增不改）
const db = getDb();
await migrate(db, { migrationsFolder: './drizzle' });
console.log('[db] migrations applied');
await db.$client.end();
