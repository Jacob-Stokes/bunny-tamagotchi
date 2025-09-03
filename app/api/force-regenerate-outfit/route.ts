import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink, rmdir } from 'fs/promises';
import path from 'path';
import GeminiImageService from '../../lib/geminiImageService';
import { GeminiImageService as GeminiImageServiceClass } from '../../lib/geminiImageService';

export async function POST(request: NextRequest) {
  try {
    const { outfitKey } = await request.json();

    if (!outfitKey) {
      return NextResponse.json({ error: 'Missing outfitKey' }, { status: 400 });
    }


    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');

    const outfitFolderPath = path.join(baseDir, outfitKey);
    const metadataPath = path.join(outfitFolderPath, 'metadata.json');

    // Read existing metadata to get outfit details
    let metadata: any = {};
    try {
      const metadataContent = await readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (error) {
      console.error('Failed to read metadata:', error);
      return NextResponse.json({ error: 'Cannot read outfit metadata' }, { status: 400 });
    }

    if (!metadata.equippedItems || !metadata.baseBunny) {
      return NextResponse.json({ error: 'Invalid metadata - missing required fields' }, { status: 400 });
    }

    // Delete existing files in the folder
    const filesToDelete = ['normal.png', 'blink.png', 'smile.png', 'wave.png', 'scene_normal.png', 'scene_blink.png'];
    
    for (const filename of filesToDelete) {
      try {
        await unlink(path.join(outfitFolderPath, filename));
      } catch {
        // File doesn't exist, which is fine
      }
    }

    // Fetch current item data from database (metadata might not have image_url)
    
    const { InventoryService } = await import('../../lib/inventoryService');
    const allItems = await InventoryService.getItems();
    
    // Map metadata items to current database items
    const equippedItems = metadata.equippedItems.map((metadataItem: any) => {
      const currentItem = allItems.find(item => item.id === metadataItem.item_id);
      if (!currentItem) {
        console.warn(`⚠️ Item ${metadataItem.item_id} not found in database, using metadata`);
        return metadataItem;
      }
      return {
        item_id: currentItem.id,
        slot: currentItem.slot,
        name: currentItem.name,
        image_url: currentItem.image_url
      };
    });
    
    
    try {
      // Call the same generation endpoint with the stored data
      const regenerateResponse = await fetch(`${request.nextUrl.origin}/api/generate-bunny-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-base-bunny': metadata.baseBunny,
          'x-scene': metadata.scene || 'meadow',
        },
        body: JSON.stringify({
          bunnyId: 'force-regen', // Dummy ID for force regeneration
          equippedItems: equippedItems, // Use fetched items with image_url
          generateAnimation: true,
          forceRegenerate: true // Flag to bypass cache
        }),
      });

      if (!regenerateResponse.ok) {
        throw new Error('Regeneration API call failed');
      }

      const result = await regenerateResponse.json();
      
      
      return NextResponse.json({
        success: true,
        message: 'Outfit regenerated successfully',
        imageUrl: result.imageUrl,
        sceneUrl: result.sceneUrl
      });

    } catch (regenerationError) {
      console.error('🔥 Regeneration failed:', regenerationError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to regenerate outfit',
        details: regenerationError instanceof Error ? regenerationError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Force regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to force regenerate outfit' },
      { status: 500 }
    );
  }
}