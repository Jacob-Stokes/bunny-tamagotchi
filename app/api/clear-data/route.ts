import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    // Clear bunny equipment (what items bunnies are wearing)
    const { error: equipmentError } = await supabase
      .from('bunny_equipment')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (equipmentError) {
      console.error('Error clearing equipment:', equipmentError);
    }

    // Clear bunny inventory (what items bunnies own)
    const { error: inventoryError } = await supabase
      .from('bunny_inventory')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (inventoryError) {
      console.error('Error clearing inventory:', inventoryError);
    }

    // Clear saved outfits
    const { error: outfitsError } = await supabase
      .from('outfits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (outfitsError) {
      console.error('Error clearing outfits:', outfitsError);
    }

    // Clear outfit favourites
    const { error: favouritesError } = await supabase
      .from('outfit_favourites')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (favouritesError) {
      console.error('Error clearing favourites:', favouritesError);
    }

    // Clear outfit generation limits
    const { error: limitsError } = await supabase
      .from('outfit_generation_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (limitsError) {
      console.error('Error clearing limits:', limitsError);
    }

    // Reset bunny stats to default values
    const { error: bunnyUpdateError } = await supabase
      .from('bunnies')
      .update({
        name: 'Bunny',
        connection: 50,
        stimulation: 50,
        comfort: 50,
        energy: 50,
        curiosity: 50,
        whimsy: 50,
        melancholy: 50,
        wisdom: 50,
        coins: 100,
        experience: 0,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (bunnyUpdateError) {
      console.error('Error resetting bunnies:', bunnyUpdateError);
    }

    // Get final counts for confirmation
    const { count: equipmentCount } = await supabase
      .from('bunny_equipment')
      .select('*', { count: 'exact', head: true });

    const { count: inventoryCount } = await supabase
      .from('bunny_inventory')
      .select('*', { count: 'exact', head: true });

    const { count: outfitsCount } = await supabase
      .from('outfits')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
      counts: {
        equipment: equipmentCount || 0,
        inventory: inventoryCount || 0,
        outfits: outfitsCount || 0
      }
    });

  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json({ 
      error: 'Failed to clear database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}