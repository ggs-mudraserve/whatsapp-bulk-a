import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function setupDatabase() {
  console.log('Starting database setup...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    return false;
  }
  
  let pool;
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log(`Database connection successful: ${result.rows[0].now}`);
    
    // Check if tables exist
    const tablesExist = await checkTablesExist(pool);
    
    if (!tablesExist) {
      console.log('Tables do not exist. Running migrations...');
      await runMigrations(pool);
    } else {
      console.log('Database tables already exist. Skipping migrations.');
    }
    
    return true;
  } catch (error) {
    console.error('Database setup error:', error);
    return false;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

async function checkTablesExist(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking if tables exist:', error);
    return false;
  }
}

async function runMigrations(pool: Pool): Promise<void> {
  try {
    // Get migration files
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migrations directory not found: ${migrationsDir}`);
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`Error running migration ${file}:`, error);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}