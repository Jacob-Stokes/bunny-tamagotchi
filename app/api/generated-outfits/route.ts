import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service key for now to access imported data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get bunny_id from query params to filter outfits
    const url = new URL(request.url);
    const bunnyId = url.searchParams.get('bunny_id');

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      );
    }

    // Query the database for saved outfits
    let query = supabase
      .from('outfits')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: outfits, error } = await query;

    if (error) {
      console.error('Database error loading outfits:', error);
      return NextResponse.json(
        { error: 'Failed to load outfits from database' },
        { status: 500 }
      );
    }

    // Filter outfits based on access rules:
    // 1. Base Bunny outfit (name = 'Base Bunny') - available to everyone (global)
    // 2. Outfits tied to the requesting bunny - only show for that specific bunny
    // 3. User's own created outfits - show for any bunny owned by that user
    let accessibleOutfits = outfits || [];
    
    if (bunnyId) {
      // Get the user_id of the bunny requesting outfits
      const { data: bunnyData } = await supabase
        .from('bunnies')
        .select('user_id')
        .eq('id', bunnyId)
        .single();
      
      const requestingUserId = bunnyData?.user_id;
      
      if (requestingUserId) {
        // Filter to show accessible outfits:
        // - Base Bunny (global for everyone)
        // - Outfits tied to this specific bunny
        // - User's own created outfits
        accessibleOutfits = outfits?.filter((outfit: any) => 
          outfit.name === 'Base Bunny' || // Global base bunny
          outfit.bunny_id === bunnyId || // Outfits for this specific bunny
          outfit.user_id === requestingUserId // User's own outfits
        ) || [];
      }
    } else {
      // No bunny_id provided - show only global base bunny
      accessibleOutfits = outfits?.filter((outfit: any) => 
        outfit.name === 'Base Bunny'
      ) || [];
    }

    // Transform accessible outfits to the expected format for the frontend
    const transformedOutfits = (accessibleOutfits || []).map((outfit: any) => {
      // Use the outfit ID as the key for consistency
      const key = outfit.equipment_signature || outfit.id;
      
      // Add cache busting timestamp
      const cacheKey = new Date(outfit.updated_at).getTime();
      
      return {
        key: key,
        normalUrl: `${outfit.image_urls?.normal || ''}?v=${cacheKey}`,
        blinkUrl: `${outfit.image_urls?.blink || ''}?v=${cacheKey}`,
        smileUrl: `${outfit.image_urls?.smile || ''}?v=${cacheKey}`,
        waveUrl: `${outfit.image_urls?.wave || ''}?v=${cacheKey}`,
        sceneNormalUrl: outfit.image_urls?.scene_normal ? `${outfit.image_urls.scene_normal}?v=${cacheKey}` : null,
        sceneBlinkUrl: outfit.image_urls?.scene_blink ? `${outfit.image_urls.scene_blink}?v=${cacheKey}` : null,
        hasBlinkFrame: !!outfit.image_urls?.blink,
        hasSmileFrame: !!outfit.image_urls?.smile,
        hasWaveFrame: !!outfit.image_urls?.wave,
        hasSceneComposition: !!outfit.image_urls?.scene_normal,
        hasSceneBlinkFrame: !!outfit.image_urls?.scene_blink,
        generatedAt: outfit.created_at,
        baseBunny: outfit.base_bunny || 'bunny-base.png',
        scene: outfit.scene || 'meadow',
        equippedItems: outfit.equipped_items?.map((item: any) => item.name) || [],
        metadata: {
          baseBunny: outfit.base_bunny,
          scene: outfit.scene,
          equippedItems: outfit.equipped_items,
          name: outfit.name,
          id: outfit.id
        },
        // Add outfit database info
        outfitId: outfit.id,
        name: outfit.name,
        isActive: outfit.is_active
      };
    });

    return NextResponse.json({ outfits: transformedOutfits });
  } catch (error) {
    console.error('Error loading generated outfits:', error);
    return NextResponse.json(
      { error: 'Failed to load generated outfits' },
      { status: 500 }
    );
  }
}