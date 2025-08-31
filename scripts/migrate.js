#!/usr/bin/env node

/**
 * Simple migration script that applies SQL files to Supabase
 * Usage: node scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need this for migrations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`🗄️  Found ${files.length} migration files`);

    for (const file of files) {
      console.log(`📝 Running migration: ${file}`);
      
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Split by semicolons and run each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error(`❌ Error in ${file}:`, error.message);
          throw error;
        }
      }
      
      console.log(`✅ Migration ${file} completed`);
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative simple approach - just log the SQL for manual execution
function showMigrations() {
  console.log('🔧 Manual Migration Mode');
  console.log('Copy and paste the following SQL into your Supabase SQL Editor:\n');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 No migrations directory found');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  files.forEach(file => {
    console.log(`-- Migration: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(sqlContent);
    console.log('\n-- End of migration\n');
  });
}

// Run migrations or show them for manual execution
if (process.argv.includes('--manual')) {
  showMigrations();
} else {
  runMigrations();
}