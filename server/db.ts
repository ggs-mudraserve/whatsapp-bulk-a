import { createClient } from '@supabase/supabase-js';

// Check for Supabase environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn("⚠️  Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.");
} else {
  console.log("Using Supabase database connection");
}

// Initialize Supabase client
export const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

// Test Supabase connection
export async function testDatabaseConnection() {
  try {
    if (!supabase) {
      console.error("Supabase client not initialized");
      return false;
    }
    
    // Simple test query to check connection
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error("Supabase connection test failed:", error);
      return false;
    }
    
    console.log("Supabase connection successful");
    return true;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
}

// For backward compatibility, export empty pool and db
export const pool = null;
export const db = null;