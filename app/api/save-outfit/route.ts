import { NextRequest, NextResponse } from 'next/server';
import { GeminiImageService } from '../../lib/geminiImageService';
import { OutfitService } from '../../lib/outfitService';

interface SaveOutfitRequest {
  bunnyId: string;
  equippedItems: Array<{
    item_id: string;
    slot: string;
    image_url: string;
    name: string;
  }>;
}

export async function POST(request: NextRequest) {
  console.log('🎨 Save outfit API called');
  
  try {
    const body: SaveOutfitRequest = await request.json();
    const { bunnyId, equippedItems } = body;

    console.log('🎨 Saving outfit for bunny:', bunnyId, 'with items:', equippedItems.length);

    if (!bunnyId) {
      console.error('❌ Missing bunnyId');
      return NextResponse.json({ error: 'Missing bunnyId' }, { status: 400 });
    }

    // Get settings
    const selectedBaseBunny = request.headers.get('x-base-bunny') || 'bunny-base.png';
    const selectedScene = request.headers.get('x-scene') || 'meadow';

    console.log(`🎨 Using base bunny: ${selectedBaseBunny}, scene: ${selectedScene}`);

    // Generate outfit name using AI
    const outfitName = await generateOutfitNameWithAI(equippedItems);
    console.log(`🎨 Generated outfit name: ${outfitName}`);

    // Generate bunny with equipment by calling the existing generation API
    console.log('🎨 Generating bunny images with equipment...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-bunny-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-base-bunny': selectedBaseBunny,
        'x-scene': selectedScene,
      },
      body: JSON.stringify({ 
        bunnyId,
        equippedItems,
        generateAnimation: true,
        forceRegenerate: true
      }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.status}`);
    }

    const result = await response.json();

    // Prepare image URLs for outfit storage
    const baseImagePath = `/generated-bunnies/${bunnyId}`;
    const imageUrls = {
      normal: `${baseImagePath}/normal.png`,
      blink: `${baseImagePath}/blink.png`,
      smile: `${baseImagePath}/smile.png`,
      wave: `${baseImagePath}/wave.png`
    };

    // Save outfit to database
    console.log('💾 Saving outfit to database...');
    const outfit = await OutfitService.createOutfit({
      bunny_id: bunnyId,
      name: outfitName,
      equipped_items: equippedItems,
      base_bunny: selectedBaseBunny,
      scene: selectedScene,
      image_urls: imageUrls
    });

    console.log('✅ Outfit saved successfully with images generated');

    return NextResponse.json({
      success: true,
      outfitId: outfit.id,
      outfitName: outfit.name,
      imageUrl: result.imageUrl,
      message: 'Outfit saved and images generated successfully'
    });

  } catch (error) {
    console.error('🔥 Error saving outfit:', error);
    
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save outfit' 
    }, { status: 500 });
  }
}

// AI-powered outfit name generation using Gemini Flash
async function generateOutfitNameWithAI(equippedItems: Array<{ item_id: string; slot: string; name: string }>): Promise<string> {
  if (equippedItems.length === 0) {
    return 'Natural Look';
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn('No Gemini API key found, falling back to simple naming');
      return generateSimpleOutfitName(equippedItems);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Fast, cheap model

    // Create item list for the prompt
    const itemList = equippedItems.map(item => `- ${item.name} (${item.slot})`).join('\n');
    
    const prompt = `Create a fun, creative, and memorable 2-4 word outfit name for a bunny character wearing these items:

${itemList}

The name should be:
- Catchy and playful (like "Mystic Scholar", "Garden Party Prince", "Cozy Bookworm")  
- Reflect the style/theme of the items
- Maximum 4 words
- No quotes or special characters
- Family-friendly

Just respond with the outfit name, nothing else.`;

    console.log('🤖 Generating outfit name with Gemini Flash...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const outfitName = response.text().trim();

    // Validate and clean the name
    if (outfitName && outfitName.length <= 50 && outfitName.length > 0) {
      console.log(`✅ AI generated outfit name: ${outfitName}`);
      return outfitName;
    } else {
      console.warn('AI name was invalid, falling back to simple naming');
      return generateSimpleOutfitName(equippedItems);
    }

  } catch (error) {
    console.error('Error generating AI outfit name:', error);
    return generateSimpleOutfitName(equippedItems);
  }
}

// Fallback simple outfit name generation
function generateSimpleOutfitName(equippedItems: Array<{ item_id: string; slot: string; name: string }>): string {
  const adjectives = ['Stylish', 'Cool', 'Trendy', 'Chic', 'Fancy', 'Casual', 'Elegant', 'Funky', 'Classic', 'Modern'];
  const themes = ['Explorer', 'Artist', 'Adventurer', 'Scholar', 'Dreamer', 'Wanderer', 'Creator', 'Thinker', 'Rebel', 'Hero'];
  
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  return `${randomAdj} ${randomTheme}`;
}