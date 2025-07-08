import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

// Configure Neon database
neonConfig.webSocketConstructor = ws as any;

// Check for Supabase environment variables first
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  console.log("Using Supabase database connection");
} else if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  DATABASE_URL is not set. Please add your Neon database URL to the .env file."
  );
  console.warn(
    "   Example: DATABASE_URL=postgresql://username:password@hostname:5432/database_name"
  );
  
  if (process.env.NODE_ENV === 'development') {
    // Use a placeholder URL for development to prevent crashes
    console.log("Using placeholder database URL for development environment");
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
  }
}

// Create database connection with error handling
let pool;
let db;

try {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  console.log("Database pool created successfully");
  db = drizzle({ client: pool, schema });
} catch (error) {
  console.error("Error creating database pool:", error);
  // Create a dummy pool for development to prevent crashes
  if (process.env.NODE_ENV === 'development') {
    console.warn("Using dummy database pool for development");
    pool = {
      query: async () => ({ rows: [] }),
      end: async () => {},
    } as any;
    db = drizzle({ client: pool as any, schema });
  } else {
    throw error;
  }
}

export { db, pool };

// Initialize Supabase client if credentials are available
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

// Test database connection
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("Database connection successful:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}