import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixOutfitOwnership() {
  console.log('🔧 Fixing outfit ownership...');
  
  try {
    // Get all current outfits
    const { data: outfits, error } = await supabase
      .from('outfits')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching outfits:', error);
      return false;
    }
    
    console.log(`📝 Found ${outfits?.length || 0} outfits to process`);
    
    for (const outfit of outfits || []) {
      console.log(`\n👗 Processing: ${outfit.name}`);
      
      if (outfit.name === 'Base Bunny') {
        console.log('  ✅ Keeping Base Bunny as global (no changes needed)');
        // Base bunny stays with dummy user_id (acts as global)
        continue;
      }
      
      // For custom outfits, we need to tie them to the actual imported bunny
      // The imported bunny ID is: 71b31c94-f7aa-4da9-904e-e20402489697
      const importedBunnyId = '71b31c94-f7aa-4da9-904e-e20402489697';
      
      console.log(`  🔄 Updating bunny_id to: ${importedBunnyId}`);
      const { error: updateError } = await supabase
        .from('outfits')
        .update({ 
          bunny_id: importedBunnyId
        })
        .eq('id', outfit.id);
      
      if (updateError) {
        console.error(`  ❌ Error updating outfit ${outfit.name}:`, updateError);
      } else {
        console.log(`  ✅ Updated outfit: ${outfit.name}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

fixOutfitOwnership().then((success) => {
  if (success) {
    console.log('\n🎉 Outfit ownership fixed successfully!');
    console.log('📋 Summary:');
    console.log('   - Base Bunny: Available to all users (global)');
    console.log('   - Custom Outfits: Tied to imported bunny (71b31c94-f7aa-4da9-904e-e20402489697)');
  } else {
    console.log('❌ Failed to fix outfit ownership');
  }
  process.exit(success ? 0 : 1);
});