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

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Initialize Supabase client if credentials are available
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;