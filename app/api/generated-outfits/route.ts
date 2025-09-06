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
      // NORMALIZED NAMING: Use folder_number for key/folder structure if available
      const folderNumber = outfit.folder_number;
      const paddedFolderNumber = folderNumber ? String(folderNumber).padStart(4, '0') : null;
      
      // Fallback to old key system if folder_number not available
      const key = paddedFolderNumber || outfit.equipment_signature || outfit.id;
      
      // NORMALIZED NAMING: Use display_name for UI, fallback to generated name from items
      const itemNames = outfit.outfit_items?.map((item: any) => item.item?.name) || [];
      const generatedDisplayName = itemNames.length > 0 ? itemNames.join(' + ') : 'Base Bunny';
      const displayName = outfit.display_name || generatedDisplayName;
      
      // Add cache busting timestamp
      const cacheKey = new Date(outfit.updated_at).getTime();
      
      // NORMALIZED URLS: Build URLs using new folder structure if available
      let baseUrl = '';
      if (paddedFolderNumber) {
        // New naming: /generated-bunnies/00000001/00000001-normal.png
        baseUrl = `/generated-bunnies/${paddedFolderNumber}/${paddedFolderNumber}`;
      } else if (outfit.image_urls?.normal) {
        // Old naming: use existing URLs
        baseUrl = outfit.image_urls.normal.replace('-normal.png', '').replace('.png', '');
      }
      
      const buildUrl = (suffix: string) => {
        if (paddedFolderNumber) {
          return `${baseUrl}-${suffix}.png?v=${cacheKey}`;
        } else if (outfit.image_urls?.[suffix]) {
          return `${outfit.image_urls[suffix]}?v=${cacheKey}`;
        }
        return null;
      };
      
      return {
        key: key,
        folderNumber: folderNumber,
        paddedFolderNumber: paddedFolderNumber,
        normalUrl: buildUrl('normal'),
        blinkUrl: buildUrl('blink'),
        smileUrl: buildUrl('smile'),
        waveUrl: buildUrl('wave'),
        sceneNormalUrl: buildUrl('scene-normal'),
        sceneBlinkUrl: buildUrl('scene-blink'),
        hasBlinkFrame: !!buildUrl('blink'),
        hasSmileFrame: !!buildUrl('smile'),
        hasWaveFrame: !!buildUrl('wave'),
        hasSceneComposition: !!buildUrl('scene-normal'),
        hasSceneBlinkFrame: !!buildUrl('scene-blink'),
        generatedAt: outfit.created_at,
        baseBunny: outfit.base_bunny || 'bunny-base.png',
        scene: outfit.scene || 'meadow',
        equippedItems: itemNames,
        displayName: displayName,
        metadata: {
          baseBunny: outfit.base_bunny,
          scene: outfit.scene,
          equippedItems: outfit.outfit_items?.map((oi: any) => ({
            item_id: oi.item_id,
            name: oi.item?.name,
            slot: oi.slot,
            image_url: oi.item?.image_url
          })) || [],
          name: outfit.name, // Technical name
          displayName: displayName, // User-facing name
          folderNumber: folderNumber,
          id: outfit.id
        },
        // Add outfit database info
        outfitId: outfit.id,
        name: displayName, // Use display name for frontend
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