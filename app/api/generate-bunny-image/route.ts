import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readdir } from 'fs/promises';
import path from 'path';
import GeminiImageService from '../../lib/geminiImageService';
import { GeminiImageService as GeminiImageServiceClass } from '../../lib/geminiImageService';
import { InventoryService } from '../../lib/inventoryService';
import { supabase, serviceClient } from '../../lib/supabase';
const { debugLog } = require('../../../debug-logger');

interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

// Get next sequential outfit number by checking both filesystem and database
async function getNextOutfitNumber(): Promise<string> {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseDir = isProduction 
    ? '/var/www/bunny-static/generated-bunnies'
    : path.join(process.cwd(), 'public', 'generated-bunnies');

  let highestNumber = 0;

  try {
    // Check filesystem for highest numbered folder
    const entries = await readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
        const num = parseInt(entry.name, 10);
        if (num > highestNumber) {
          highestNumber = num;
        }
      }
    }
  } catch (error) {
    console.log('Directory not found or empty, starting from 0001');
  }

  try {
    // Also check database for any higher numbered outfits
    const { data: outfits, error } = await serviceClient
      .from('outfits')
      .select('name')
      .like('name', '____') // Match exactly 4 digits
      .order('name', { ascending: false })
      .limit(1);

    if (!error && outfits && outfits.length > 0) {
      const dbHighest = parseInt(outfits[0].name, 10);
      if (!isNaN(dbHighest) && dbHighest > highestNumber) {
        highestNumber = dbHighest;
      }
    }
  } catch (error) {
    console.warn('Could not check database for highest outfit number:', error);
  }

  const nextNumber = highestNumber + 1;
  return nextNumber.toString().padStart(4, '0');
}

export async function POST(request: NextRequest) {
  try {
    let bunnyId, equippedItems, generateAnimation, forceRegenerate;
    
    try {
      const body = await request.json();
      bunnyId = body.bunnyId;
      equippedItems = body.equippedItems || [];
      generateAnimation = body.generateAnimation || false;
      forceRegenerate = body.forceRegenerate || false;
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }


    if (!bunnyId) {
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    // Get selected base bunny from request or use default
    const selectedBaseBunny = request.headers.get('x-base-bunny') || 'bunny-base.png';

    // If no items equipped, return base bunny
    if (equippedItems.length === 0) {
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/base-bunnies/${selectedBaseBunny}`,
        cached: true,
        equippedItems: 0,
        method: 'base'
      });
    }

    // Get selected scene
    const selectedScene = request.headers.get('x-scene') || 'meadow';

    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');

    // Generate sequential outfit number and folder paths
    const outfitNumber = await getNextOutfitNumber();
    const bunnyFolderName = outfitNumber;
    const bunnyFolderPath = path.join(baseDir, bunnyFolderName);
    const bunnyImagePath = path.join(bunnyFolderPath, `${outfitNumber}-normal.png`);
    const bunnyMetadataPath = path.join(bunnyFolderPath, 'metadata.json');

    console.log(`🎨 Generating new outfit ${outfitNumber} with ${equippedItems.length} items`);

    // Create directory if it doesn't exist
    await require('fs/promises').mkdir(baseDir, { recursive: true });

    try {
      // Create bunny folder (or use existing if it already exists)
      await require('fs/promises').mkdir(bunnyFolderPath, { recursive: true });
      
      // Check if folder already exists and log for testing
      const fs = require('fs/promises');
      try {
        const existingFiles = await fs.readdir(bunnyFolderPath);
        if (existingFiles.length > 0) {
          console.log(`📁 Folder ${outfitNumber} already exists with ${existingFiles.length} files - will overwrite`);
        }
      } catch (e) {
        console.log(`📁 Creating new folder: ${outfitNumber}`);
      }

      // Generate bunny with items (transparent background only)
      const bunnyResult = await GeminiImageService.generateBunnyWithItems(equippedItems, selectedBaseBunny);
      
      if (!bunnyResult) {
        throw new Error('Failed to generate bunny with items');
      }
      
      // Save bunny image
      await writeFile(bunnyImagePath, bunnyResult.imageData);

      // Generate animation frames (always generate for new outfits)
      let animationFrames = {};
      const framesToGenerate = generateAnimation 
        ? ['blink', 'smile', 'wave', 'sad-closed-eyes', 'sad-open-eyes']
        : ['sad-closed-eyes', 'sad-open-eyes']; // Always generate sad frames
      
      try {
        console.log(`🎭 Generating animation frames: ${framesToGenerate.join(', ')}`);
        const geminiService = new GeminiImageServiceClass();
        const frames = await geminiService.generateAnimationFrames(bunnyResult.imageData, framesToGenerate);
        
        const generatedFrames = [];
        
        // Save blink frame
        if (frames && frames.blink) {
          const blinkFramePath = path.join(bunnyFolderPath, `${outfitNumber}-blink.png`);
          await writeFile(blinkFramePath, frames.blink.imageData);
          
          try {
            const { SceneCompositor } = await import('../../lib/sceneCompositor');
            const transparentBlinkBuffer = await SceneCompositor.removeWhiteBackground(blinkFramePath);
            await writeFile(blinkFramePath, transparentBlinkBuffer);
            generatedFrames.push('blink');
          } catch (blinkTransparentError) {
            console.error('🔥 Blink frame background removal failed:', blinkTransparentError);
          }
        }
        
        // Save smile frame
        if (frames && frames.smile) {
          const smileFramePath = path.join(bunnyFolderPath, `${outfitNumber}-smile.png`);
          await writeFile(smileFramePath, frames.smile.imageData);
          
          try {
            const { SceneCompositor } = await import('../../lib/sceneCompositor');
            const transparentSmileBuffer = await SceneCompositor.removeWhiteBackground(smileFramePath);
            await writeFile(smileFramePath, transparentSmileBuffer);
            generatedFrames.push('smile');
          } catch (smileTransparentError) {
            console.error('🔥 Smile frame background removal failed:', smileTransparentError);
          }
        }
        
        // Save wave frame
        if (frames && frames.wave) {
          const waveFramePath = path.join(bunnyFolderPath, `${outfitNumber}-wave.png`);
          await writeFile(waveFramePath, frames.wave.imageData);
          
          try {
            const { SceneCompositor } = await import('../../lib/sceneCompositor');
            const transparentWaveBuffer = await SceneCompositor.removeWhiteBackground(waveFramePath);
            await writeFile(waveFramePath, transparentWaveBuffer);
            generatedFrames.push('wave');
          } catch (waveTransparentError) {
            console.error('🔥 Wave frame background removal failed:', waveTransparentError);
          }
        }
        
        // Save sad frames (always generate these)
        if (frames && frames['sad-closed-eyes']) {
          const sadClosedFramePath = path.join(bunnyFolderPath, `${outfitNumber}-sad-closed-eyes.png`);
          await writeFile(sadClosedFramePath, frames['sad-closed-eyes'].imageData);
          
          try {
            const { SceneCompositor } = await import('../../lib/sceneCompositor');
            const transparentSadClosedBuffer = await SceneCompositor.removeWhiteBackground(sadClosedFramePath);
            await writeFile(sadClosedFramePath, transparentSadClosedBuffer);
            generatedFrames.push('sad-closed-eyes');
          } catch (sadClosedTransparentError) {
            console.error('🔥 Sad closed eyes frame background removal failed:', sadClosedTransparentError);
          }
        }
        
        if (frames && frames['sad-open-eyes']) {
          const sadOpenFramePath = path.join(bunnyFolderPath, `${outfitNumber}-sad-open-eyes.png`);
          await writeFile(sadOpenFramePath, frames['sad-open-eyes'].imageData);
          
          try {
            const { SceneCompositor } = await import('../../lib/sceneCompositor');
            const transparentSadOpenBuffer = await SceneCompositor.removeWhiteBackground(sadOpenFramePath);
            await writeFile(sadOpenFramePath, transparentSadOpenBuffer);
            generatedFrames.push('sad-open-eyes');
          } catch (sadOpenTransparentError) {
            console.error('🔥 Sad open eyes frame background removal failed:', sadOpenTransparentError);
          }
        }
        
        if (generatedFrames.length > 0) {
          animationFrames = { generated: generatedFrames };
        } else {
          animationFrames = { error: 'Failed to generate any animation frames' };
        }
      } catch (error) {
        console.error('🔥 Animation frame generation failed:', error);
        animationFrames = { error: 'Animation frame generation failed' };
      }

      // Apply white background removal to make bunny transparent
      let transparentBunnyResult = {};
      try {
        const { SceneCompositor } = await import('../../lib/sceneCompositor');
        
        // Remove white background to make bunny transparent
        const transparentBunnyBuffer = await SceneCompositor.removeWhiteBackground(bunnyImagePath);
        
        // Save the transparent version over the original
        await writeFile(bunnyImagePath, transparentBunnyBuffer);
        
        transparentBunnyResult = { applied: true };
      } catch (transparentError) {
        console.error('🔥 White background removal failed:', transparentError);
        transparentBunnyResult = { error: 'Background removal failed' };
      }

      // Save metadata
      const metadata = {
        generatedAt: new Date().toISOString(),
        baseBunny: selectedBaseBunny,
        scene: selectedScene,
        equippedItems: equippedItems.map(item => ({
          item_id: item.item_id,
          slot: item.slot,
          name: item.name
        })),
        hasAnimation: generateAnimation && (animationFrames.cached || animationFrames.generated),
        hasTransparentBackground: transparentBunnyResult.applied || false,
        version: '2.0'
      };
      await writeFile(bunnyMetadataPath, JSON.stringify(metadata, null, 2));

      // Create outfit record in database with junction table entries
      let outfitDbResult = {};
      try {
        console.log(`💾 Creating database record for outfit ${outfitNumber}`);
        debugLog('🗄️ Starting database operations', { outfitNumber, bunnyId });
        
        // Get user info for the bunny, fallback to bunnyId if bunny doesn't exist
        let userId = bunnyId; // Default fallback
        debugLog('🔑 Checking serviceClient', { serviceClientExists: !!serviceClient });
        
        try {
          const { data: bunnyData } = await serviceClient
            .from('bunnies')
            .select('user_id')
            .eq('id', bunnyId)
            .single();
          debugLog('👤 Bunny lookup result', { bunnyData });
          if (bunnyData?.user_id) {
            userId = bunnyData.user_id;
          }
        } catch (userError) {
          console.warn('Could not get user for bunny, using bunnyId as fallback:', userError);
        }

        // Create the outfit record using service role to bypass RLS
        // Create equipment signature
        const equipmentSignature = equippedItems
          .sort((a, b) => a.item_id.localeCompare(b.item_id))
          .map(item => item.item_id)
          .join(',');
        const fullSignature = `${selectedBaseBunny}|${selectedScene}|${equipmentSignature}`;
        
        debugLog('📝 About to insert outfit record', {
          name: outfitNumber,
          user_id: userId,
          bunny_id: bunnyId,
          base_bunny: selectedBaseBunny,
          scene: selectedScene,
          equipment_signature: fullSignature,
          serviceClientExists: !!serviceClient
        });
        
        // Create display name from equipped items
        const itemNames = equippedItems.map(item => item.name);
        const displayName = itemNames.length > 0 ? itemNames.join(' + ') : 'Base Bunny';
        
        // Extract numeric folder number from outfit number (e.g., "0012" -> 12)
        const folderNumber = parseInt(outfitNumber, 10);

        const { data: outfit, error: outfitError } = await serviceClient
          .from('outfits')
          .insert({
            name: outfitNumber,
            user_id: userId,
            bunny_id: bunnyId, // Store the bunny that requested this outfit
            base_bunny: selectedBaseBunny,
            scene: selectedScene,
            equipment_signature: fullSignature,
            equipped_items: equippedItems, // Include the actual equipped items
            display_name: displayName, // User-friendly display name
            folder_number: folderNumber, // Numeric folder number for UI system
            image_urls: [`/generated-bunnies/${outfitNumber}/${outfitNumber}-normal.png`],
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        debugLog('💾 Outfit insert result', { outfit, outfitError });

        if (outfitError) {
          throw outfitError;
        }

        console.log(`✅ Created outfit record: ${outfit.id}`);

        // Create outfit_items junction records
        if (equippedItems.length > 0) {
          const outfitItems = equippedItems.map(item => ({
            outfit_id: outfit.id,
            item_id: item.item_id,
            slot: item.slot
          }));

          const { error: itemsError } = await serviceClient
            .from('outfit_items')
            .insert(outfitItems);

          if (itemsError) {
            throw itemsError;
          }

          console.log(`✅ Created ${outfitItems.length} outfit_items records`);
        }

        // Create bunny_outfits junction record to give outfit to this bunny
        const { error: bunnyOutfitError } = await serviceClient
          .from('bunny_outfits')
          .insert({
            bunny_id: bunnyId,
            outfit_id: outfit.id,
            is_active: false, // User can activate it later
            acquired_at: new Date().toISOString()
          });

        if (bunnyOutfitError) {
          throw bunnyOutfitError;
        }

        console.log(`✅ Created bunny_outfit record for bunny ${bunnyId}`);
        
        outfitDbResult = { 
          created: true, 
          outfitId: outfit.id,
          outfitNumber: outfitNumber,
          itemCount: equippedItems.length
        };
      } catch (dbError) {
        console.error('🔥 Database record creation failed:', dbError);
        outfitDbResult = { error: 'Database record creation failed', details: dbError.message };
      }

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/generated-bunnies/${bunnyFolderName}/${outfitNumber}-normal.png`,
        cached: false,
        equippedItems: equippedItems.length,
        method: 'sequential_outfit_generation',
        folderName: bunnyFolderName,
        outfitNumber: outfitNumber,
        animation: animationFrames,
        transparent: transparentBunnyResult,
        database: outfitDbResult
      });

    } catch (geminiError) {
      console.error('🔥 Gemini image generation failed:', geminiError);
      
      // Fallback to base bunny
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/base-bunnies/${selectedBaseBunny}`,
        cached: false,
        error: 'Generation failed, using base bunny'
      });
    }

  } catch (error) {
    console.error('Bunny generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate bunny image' },
      { status: 500 }
    );
  }
}