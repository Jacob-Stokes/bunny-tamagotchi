import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Use different paths for development vs production
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction 
      ? '/var/www/bunny-static/generated-bunnies'
      : path.join(process.cwd(), 'public', 'generated-bunnies');


    let outfitFolders: string[] = [];
    try {
      outfitFolders = await readdir(baseDir);
    } catch {
      return NextResponse.json({ outfits: [] });
    }

    const outfits = [];

    for (const folder of outfitFolders) {
      try {
        const folderPath = path.join(baseDir, folder);
        const folderStat = await stat(folderPath);
        
        if (folderStat.isDirectory()) {
          const normalPath = path.join(folderPath, 'normal.png');
          const blinkPath = path.join(folderPath, 'blink.png');
          const sceneNormalPath = path.join(folderPath, 'scene_normal.png');
          const sceneBlinkPath = path.join(folderPath, 'scene_blink.png');
          const metadataPath = path.join(folderPath, 'metadata.json');

          // Check if normal.png exists (required)
          let normalExists = false;
          let normalStat: any = null;
          try {
            normalStat = await stat(normalPath);
            normalExists = true;
          } catch {
            continue; // Skip this folder if no normal.png
          }

          // Check for other files
          let hasBlinkFrame = false;
          let hasSceneComposition = false;
          let hasSceneBlinkFrame = false;

          try {
            await stat(blinkPath);
            hasBlinkFrame = true;
          } catch {}

          try {
            await stat(sceneNormalPath);
            hasSceneComposition = true;
          } catch {}

          try {
            await stat(sceneBlinkPath);
            hasSceneBlinkFrame = true;
          } catch {}

          // Try to read metadata
          let metadata: any = {};
          try {
            const metadataContent = await readFile(metadataPath, 'utf-8');
            metadata = JSON.parse(metadataContent);
          } catch {}

          const outfit = {
            key: folder,
            normalUrl: `/generated-bunnies/${folder}/normal.png`,
            blinkUrl: hasBlinkFrame ? `/generated-bunnies/${folder}/blink.png` : null,
            sceneNormalUrl: hasSceneComposition ? `/generated-bunnies/${folder}/scene_normal.png` : null,
            sceneBlinkUrl: hasSceneBlinkFrame ? `/generated-bunnies/${folder}/scene_blink.png` : null,
            hasBlinkFrame,
            hasSceneComposition,
            hasSceneBlinkFrame,
            generatedAt: normalStat.mtime,
            baseBunny: metadata.baseBunny || 'Unknown',
            scene: metadata.scene || 'Unknown',
            equippedItems: metadata.equippedItems?.map((item: any) => item.name) || [],
            metadata
          };

          outfits.push(outfit);
        }
      } catch (error) {
        console.error(`Error processing folder ${folder}:`, error);
      }
    }

    // Sort by generation time (newest first)
    outfits.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());


    return NextResponse.json({ outfits });
  } catch (error) {
    console.error('Error loading generated outfits:', error);
    return NextResponse.json(
      { error: 'Failed to load generated outfits' },
      { status: 500 }
    );
  }
}