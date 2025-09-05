import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugAPI() {
  console.log('🔍 Debugging API access control...\n');
  
  const testBunnyId = 'deb70ac2-9c73-4f65-9345-f44438bd4935';
  const importedBunnyId = '71b31c94-f7aa-4da9-904e-e20402489697';
  
  // Check bunny data
  console.log('🐰 Checking bunny data:');
  const { data: testBunnyData } = await supabase
    .from('bunnies')
    .select('*')
    .eq('id', testBunnyId)
    .single();
  
  const { data: importedBunnyData } = await supabase
    .from('bunnies')
    .select('*')
    .eq('id', importedBunnyId)
    .single();
  
  console.log(`Test bunny (${testBunnyId}):`, testBunnyData);
  console.log(`Imported bunny (${importedBunnyId}):`, importedBunnyData);
  
  // Check outfits
  console.log('\n👗 Checking outfit data:');
  const { data: outfits } = await supabase
    .from('outfits')
    .select('id, name, bunny_id, user_id');
  
  console.log('All outfits:');
  outfits?.forEach(outfit => {
    console.log(`  - ${outfit.name}:`);
    console.log(`    bunny_id: ${outfit.bunny_id}`);
    console.log(`    user_id: ${outfit.user_id}`);
  });
  
  // Test filter logic
  console.log('\n🔍 Testing filter logic:');
  const requestingUserId = testBunnyData?.user_id;
  console.log(`Requesting user ID: ${requestingUserId}`);
  
  const accessibleOutfits = outfits?.filter((outfit: any) => 
    outfit.name === 'Base Bunny' || // Global base bunny
    outfit.bunny_id === testBunnyId || // Outfits for this specific bunny
    outfit.user_id === requestingUserId // User's own outfits
  );
  
  console.log('Accessible outfits for test bunny:');
  accessibleOutfits?.forEach(outfit => {
    console.log(`  - ${outfit.name} (reason: ${
      outfit.name === 'Base Bunny' ? 'global base bunny' :
      outfit.bunny_id === testBunnyId ? 'tied to this bunny' :
      outfit.user_id === requestingUserId ? 'user owns this' : 'unknown'
    })`);
  });
}

debugAPI();