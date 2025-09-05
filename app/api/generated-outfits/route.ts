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

    // Query outfits using junction table - only get outfits the bunny owns
    let accessibleOutfits = [];
    
    if (bunnyId) {
      // Get outfits the bunny owns via junction table with outfit items
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select(`
          *,
          bunny_outfits!inner(bunny_id, is_active),
          outfit_items(
            item_id,
            slot,
            item:items(name, image_url)
          )
        `)
        .eq('bunny_outfits.bunny_id', bunnyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error loading outfits:', error);
        return NextResponse.json(
          { error: 'Failed to load outfits from database' },
          { status: 500 }
        );
      }

      accessibleOutfits = outfits || [];
    } else {
      // No bunny_id provided - return empty (user needs to be authenticated)
      accessibleOutfits = [];
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
        equippedItems: outfit.outfit_items?.map((item: any) => item.item?.name) || [],
        metadata: {
          baseBunny: outfit.base_bunny,
          scene: outfit.scene,
          equippedItems: outfit.outfit_items?.map((oi: any) => ({
            item_id: oi.item_id,
            name: oi.item?.name,
            slot: oi.slot,
            image_url: oi.item?.image_url
          })) || [],
          name: outfit.name,
          id: outfit.id
        },
        // Add outfit database info
        outfitId: outfit.id,
        name: outfit.name,
        isActive: outfit.bunny_outfits?.[0]?.is_active || false
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