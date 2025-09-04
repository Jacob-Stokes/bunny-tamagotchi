import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
    }

    console.log('Starting database clear operation...');

    // Clear bunny equipment (what items bunnies are wearing)
    console.log('Clearing equipment...');
    const { data: equipmentData, error: equipmentError } = await supabase
      .from('bunny_equipment')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      .select();

    if (equipmentError) {
      console.error('Error clearing equipment:', equipmentError);
    } else {
      console.log('Cleared equipment records:', equipmentData?.length || 0);
    }

    // Clear bunny inventory (what items bunnies own)
    console.log('Clearing inventory...');
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('bunny_inventory')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      .select();

    if (inventoryError) {
      console.error('Error clearing inventory:', inventoryError);
    } else {
      console.log('Cleared inventory records:', inventoryData?.length || 0);
    }

    // Clear saved outfits
    console.log('Clearing outfits...');
    const { data: outfitsData, error: outfitsError } = await supabase
      .from('outfits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      .select();

    if (outfitsError) {
      console.error('Error clearing outfits:', outfitsError);
    } else {
      console.log('Cleared outfit records:', outfitsData?.length || 0);
    }

    // Clear outfit favourites
    console.log('Clearing favourites...');
    const { data: favouritesData, error: favouritesError } = await supabase
      .from('outfit_favourites')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      .select();

    if (favouritesError) {
      console.error('Error clearing favourites:', favouritesError);
    } else {
      console.log('Cleared favourite records:', favouritesData?.length || 0);
    }

    // Clear outfit generation limits
    console.log('Clearing limits...');
    const { data: limitsData, error: limitsError } = await supabase
      .from('outfit_generation_limits')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
      .select();

    if (limitsError) {
      console.error('Error clearing limits:', limitsError);
    } else {
      console.log('Cleared limit records:', limitsData?.length || 0);
    }

    // Reset bunny stats to default values
    const { error: bunnyUpdateError } = await supabase
      .from('bunnies')
      .update({
        name: 'Bunny',
        connection: 50,
        stimulation: 60,
        comfort: 70,
        energy: 80,
        curiosity: 40,
        whimsy: 50,
        melancholy: 30,
        wisdom: 20,
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

    console.log('Clear operation complete');
    
    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
      cleared: {
        equipment: equipmentData?.length || 0,
        inventory: inventoryData?.length || 0,
        outfits: outfitsData?.length || 0,
        favourites: favouritesData?.length || 0,
        limits: limitsData?.length || 0
      },
      finalCounts: {
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