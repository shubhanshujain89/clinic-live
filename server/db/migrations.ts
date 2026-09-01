/**
 * Database Migration Scripts for ClinicFlow Pro
 * 
 * This file contains functions to run migrations and seed data.
 * Run with: npm run db:migrate
 */

import { getPool, executeQuery, executeTransaction, closePool } from './connection.js';
import { SCHEMA_SQL, SEED_DATA_SQL } from './schema.js';
import { hashPassword } from '../db.js';

/**
 * Split SQL statements by semicolon, handling edge cases.
 * Respects single-quoted and double-quoted string literals so that
 * semicolons inside values are not treated as statement boundaries.
 */
function splitSqlStatements(sql: string): string[] {
  sql = sql.replace(/^\s*--[^\r\n]*(?:\r?\n|$)/gm, '');
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';
    if (char === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    else if (char === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (char === ';' && !inSingle && !inDouble) {
      statements.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements.filter(Boolean);
}

/**
 * Run all schema migrations
 */
export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');
  
  const statements = splitSqlStatements(SCHEMA_SQL);
  
  for (const statement of statements) {
    const executableStatement = statement.replace(/^(?:\s*--[^\r\n]*(?:\r?\n|$))+/, '').trim();
    if (!executableStatement) continue;
    
    try {
      await executeQuery(executableStatement);
      console.log(`✅ Executed: ${executableStatement.substring(0, 80)}...`);
    } catch (error) {
      // Some statements might fail if they already exist (e.g., ALTER TABLE)
      // We'll log but continue for non-critical errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Duplicate column') || 
          errorMessage.includes('already exists') ||
          errorMessage.includes('Duplicate key')) {
        console.log(`⚠️  Skipped (already exists): ${executableStatement.substring(0, 80)}...`);
      } else {
        console.error(`❌ Failed: ${executableStatement.substring(0, 80)}...`);
        console.error(`   Error: ${errorMessage}`);
        throw error;
      }
    }
  }
  
  console.log('✅ All migrations completed successfully');
}

/**
 * Run seed data insertion
 */
export async function runSeedData(): Promise<void> {
  console.log('🌱 Running seed data insertion...');
  
  const statements = splitSqlStatements(SEED_DATA_SQL);
  
  for (const statement of statements) {
    let executableStatement = statement.replace(/^(?:\s*--[^\r\n]*(?:\r?\n|$))+/, '').trim();
    if (!executableStatement) continue;

    if (executableStatement.includes('INSERT IGNORE INTO staff_users')) {
      executableStatement = executableStatement
        .replace('__SUPER_ADMIN_PASSWORD_HASH__', hashPassword('admin'))
        .replace('__ADMIN_PASSWORD_HASH__', hashPassword('admin'))
        .replace('__DOCTOR_PASSWORD_HASH__', hashPassword('doctor'))
        .replace('__STAFF_PASSWORD_HASH__', hashPassword('staff'));
    }
    
    try {
      await executeQuery(executableStatement);
      console.log(`✅ Seeded: ${executableStatement.substring(0, 80)}...`);

      if (executableStatement.includes('INSERT IGNORE INTO staff_users')) {
        for (const account of [
          { email: 'admin@clinic.local', password: 'admin' },
          { email: 'staff@clinic.local', password: 'staff' },
        ]) {
          await executeQuery(
            'UPDATE `staff_users` SET password_hash = ? WHERE email = ?',
            [hashPassword(account.password), account.email]
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Duplicate entry') || 
          errorMessage.includes('Duplicate key')) {
        console.log(`⚠️  Skipped (already exists): ${executableStatement.substring(0, 80)}...`);
      } else {
        console.error(`❌ Failed: ${executableStatement.substring(0, 80)}...`);
        console.error(`   Error: ${errorMessage}`);
        // Don't throw for seed data - it's okay if some already exist
      }
    }
  }
  
  console.log('✅ Seed data insertion completed');
}

/**
 * Full database initialization - runs migrations and seed data
 */
export async function initializeDatabase(): Promise<void> {
  console.log('🚀 Initializing database...');
  
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Cannot connect to database. Check your .env configuration.');
    }
    
    console.log('✅ Database connection established');
    
    // Run migrations
    await runMigrations();
    
    // Run seed data
    await runSeedData();
    
    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

/**
 * Test database connection
 */
async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables(): Promise<void> {
  console.log('⚠️  Dropping all tables...');
  
  const tables = [
    'whatsapp_logs',
    'settings',
    'doctor_status',
    'queue_events',
    'tokens',
    'appointments',
    'sessions',
    'patients',
    'staff_users',
    'doctors',
    'clinics'
  ];
  
  for (const table of tables) {
    try {
      await executeQuery(`DROP TABLE IF EXISTS \`${table}\`;`);
      console.log(`✅ Dropped table: ${table}`);
    } catch (error) {
      console.error(`❌ Failed to drop table ${table}:`, error);
    }
  }
  
  console.log('✅ All tables dropped');
}

/**
 * Reset database - drop all tables and reinitialize
 */
export async function resetDatabase(): Promise<void> {
  console.log('🔄 Resetting database...');
  await dropAllTables();
  await initializeDatabase();
}

// CLI entry point
const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigrations()
      .finally(() => closePool())
      .catch(() => process.exit(1));
    break;
  case 'seed':
    runSeedData()
      .finally(() => closePool())
      .catch(() => process.exit(1));
    break;
  case 'reset':
    resetDatabase().catch(() => process.exit(1));
    break;
  case 'drop':
    dropAllTables()
      .finally(() => closePool())
      .catch(() => process.exit(1));
    break;
  default:
    console.log(`
Database Migration Commands:
  npm run db:migrate    - Run migrations and seed data
  npm run db:seed       - Run seed data only
  npm run db:reset      - Drop all tables and reinitialize
  npm run db:drop       - Drop all tables (DANGEROUS)
    `);
    process.exit(1);
}