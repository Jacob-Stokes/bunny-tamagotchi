const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🔧 Adding folder_number column...');
    
    // Add folder_number column
    const { error: error1 } = await supabase
      .from('outfits')
      .select('folder_number')
      .limit(1);
      
    if (error1 && error1.code === '42703') {
      // Column doesn't exist, we need to add it manually via the dashboard
      console.log('❌ Cannot add columns directly via client. Please run this SQL in Supabase dashboard:');
      console.log('');
      console.log('ALTER TABLE outfits ADD COLUMN folder_number INTEGER;');
      console.log('ALTER TABLE outfits ADD COLUMN display_name TEXT;');
      console.log('CREATE INDEX idx_outfits_folder_number ON outfits(folder_number);');
      console.log('');
      console.log('Then run this script again.');
      return;
    }
    
    console.log('✅ Columns already exist or were added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration();