import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const normalizedKey = key.trim();
        if (process.env[normalizedKey] === undefined) {
          process.env[normalizedKey] = valueParts.join('=').trim();
        }
      }
    }
  });
}

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
  enableKeepAlive: boolean;
  keepAliveInitialDelay: number;
}

function getDatabaseConfig(): DatabaseConfig {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !password || !database) {
    throw new Error(
      'Missing required database environment variables. ' +
      'Please set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in your .env file.'
    );
  }

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  };
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testConnection(): Promise<boolean> {
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

export async function executeQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function executeQueryOne<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await executeQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function executeInsert(
  sql: string,
  params: any[] = []
): Promise<{ insertId: number; affectedRows: number }> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result as { insertId: number; affectedRows: number };
}

export async function executeUpdate(
  sql: string,
  params: any[] = []
): Promise<{ affectedRows: number }> {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result as { affectedRows: number };
}

export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}