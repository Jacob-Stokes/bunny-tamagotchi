import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkTables() {
  console.log('🔍 Checking available tables...');
  
  // Try common table names
  const tables = ['users', 'bunnies', 'outfits', 'items', 'inventory', 'bunny_inventory'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${data?.length || 0} sample rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e}`);
    }
  }
}

checkTables();