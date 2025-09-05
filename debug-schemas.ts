import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchemas() {
  console.log('🔍 Testing insert with minimal data...');
  
  // Test bunnies table
  console.log('\n🐰 Testing bunnies table:');
  try {
    const { data, error } = await supabase
      .from('bunnies')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Test Bunny'
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Bunnies insert failed: ${error.message}`);
    } else {
      console.log(`✅ Bunnies insert worked! ID: ${data.id}`);
      
      // Clean up
      await supabase.from('bunnies').delete().eq('id', data.id);
    }
  } catch (e) {
    console.log(`❌ Bunnies error: ${e}`);
  }
  
  // Test outfits table
  console.log('\n👗 Testing outfits table:');
  try {
    const { data, error } = await supabase
      .from('outfits')
      .insert({
        bunny_id: '00000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Test Outfit',
        equipped_items: [],
        equipment_signature: 'test',
        base_bunny: 'bunny-base',
        scene: 'meadow',
        image_urls: {},
        is_active: false
      })
      .select()
      .single();
    
    if (error) {
      console.log(`❌ Outfits insert failed: ${error.message}`);
    } else {
      console.log(`✅ Outfits insert worked! ID: ${data.id}`);
      
      // Clean up
      await supabase.from('outfits').delete().eq('id', data.id);
    }
  } catch (e) {
    console.log(`❌ Outfits error: ${e}`);
  }
}

checkSchemas();