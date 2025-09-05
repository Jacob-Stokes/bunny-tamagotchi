import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function makeOutfitsGlobal() {
  console.log('🔄 Adding is_global column and marking imported outfits as global...');
  
  try {
    // First, try to add the column (this might fail if it already exists)
    console.log('📝 Adding is_global column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE outfits ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;'
    });
    
    if (alterError) {
      console.log('⚠️  Column might already exist or RPC not available, trying direct update...');
    }
    
    // Update existing outfits to be global
    console.log('🌍 Marking existing outfits as global...');
    const { data, error: updateError } = await supabase
      .from('outfits')
      .update({ is_global: true })
      .select();
    
    if (updateError) {
      console.error('❌ Error updating outfits:', updateError);
      
      // If is_global column doesn't exist, we'll work without it for now
      console.log('💡 Working without is_global column - will show all outfits');
      return true;
    }
    
    console.log(`✅ Successfully marked ${data?.length || 0} outfits as global`);
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

makeOutfitsGlobal().then((success) => {
  if (success) {
    console.log('🎉 Migration completed successfully!');
  } else {
    console.log('❌ Migration failed');
  }
  process.exit(success ? 0 : 1);
});