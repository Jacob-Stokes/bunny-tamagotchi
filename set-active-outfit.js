const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setActiveOutfit() {
  const bunnyId = 'ee630f8d-21c5-46e1-8e4c-fafc796aad7e';
  const outfitName = '0001';
  
  try {
    // First, find the outfit
    const { data: outfit, error: outfitError } = await supabase
      .from('outfits')
      .select('id')
      .eq('name', outfitName)
      .single();
    
    if (outfitError || !outfit) {
      console.log('❌ Outfit not found:', outfitError);
      return;
    }
    
    console.log('✅ Found outfit:', outfit.id);
    
    // Clear any existing active outfits for this bunny
    await supabase
      .from('bunny_outfits')
      .update({ is_active: false })
      .eq('bunny_id', bunnyId);
    
    // Set this outfit as active
    const { data: result, error: updateError } = await supabase
      .from('bunny_outfits')
      .upsert({
        bunny_id: bunnyId,
        outfit_id: outfit.id,
        is_active: true,
        acquired_at: new Date().toISOString()
      })
      .select();
    
    if (updateError) {
      console.log('❌ Update error:', updateError);
      return;
    }
    
    console.log('✅ Set outfit 0001 as active for bunny');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setActiveOutfit();