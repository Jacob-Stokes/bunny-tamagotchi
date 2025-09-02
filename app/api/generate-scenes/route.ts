import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import GeminiImageService from '../../lib/geminiImageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedSceneId = body.sceneId;
    
    const scenes = requestedSceneId 
      ? [requestedSceneId] 
      : ['meadow', 'forest', 'beach', 'garden', 'snowy', 'space', 'library', 'cafe'];
    
    const scenesDir = path.join(process.cwd(), 'public', 'scenes');
    
    // Create scenes directory
    await mkdir(scenesDir, { recursive: true });
    
    const results = [];
    
    for (const sceneId of scenes) {
      console.log(`Generating scene: ${sceneId}`);
      
      try {
        const result = await GeminiImageService.generateSceneBackground(sceneId);
        
        if (result) {
          const filePath = path.join(scenesDir, `${sceneId}.png`);
          await writeFile(filePath, result.imageData);
          results.push({ scene: sceneId, success: true });
          console.log(`✅ Generated: ${sceneId}.png`);
        } else {
          results.push({ scene: sceneId, success: false, error: 'No image returned' });
          console.log(`❌ Failed: ${sceneId}`);
        }
      } catch (error) {
        results.push({ scene: sceneId, success: false, error: error instanceof Error ? error.message : String(error) });
        console.log(`❌ Error generating ${sceneId}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      results,
      generated: results.filter(r => r.success).length,
      total: scenes.length
    });
    
  } catch (error) {
    console.error('Scene generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate scenes' },
      { status: 500 }
    );
  }
}