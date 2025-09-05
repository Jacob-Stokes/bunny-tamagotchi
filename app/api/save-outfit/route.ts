import { NextRequest, NextResponse } from 'next/server';
import { GeminiImageService } from '../../lib/geminiImageService';
import { OutfitService } from '../../lib/outfitService';
import { supabase } from '../../lib/supabase';

interface SaveOutfitRequest {
  bunny_id: string;
  outfit_name: string;
  selected_items: Array<{
    item_id: string;
    slot: string;
    image_url: string;
    name: string;
  }>;
}

// Verify that all generated images actually exist
async function verifyGeneratedImages(selected_items: Array<{ item_id: string; slot: string; name: string }>, selectedBaseBunny: string) {
  const fs = require('fs').promises;
  const path = require('path');
  const { CacheUtils } = await import('../../lib/cacheUtils');
  
  // Convert to EquippedItem format for cache key generation
  const equippedItems = selected_items.map(item => ({
    item_id: item.item_id,
    slot: item.slot,
    image_url: '',
    name: item.name
  }));
  
  const cacheKey = CacheUtils.getBunnyItemsCacheKey(equippedItems, selectedBaseBunny);
  
  const publicDir = path.join(process.cwd(), 'public');
  const bunnyDir = path.join(publicDir, 'generated-bunnies', cacheKey);
  
  const requiredImages = ['normal.png', 'blink.png', 'smile.png', 'wave.png'];
  
  for (const imageName of requiredImages) {
    const imagePath = path.join(bunnyDir, imageName);
    try {
      await fs.access(imagePath);
    } catch (error) {
      throw new Error(`Generated image ${imageName} does not exist at ${imagePath}`);
    }
  }
  
  return cacheKey;
}

// Apply outfit to bunny (equip all items)
async function applyOutfitToBunny(bunny_id: string, selected_items: Array<{ item_id: string; slot: string; name: string }>) {
  const { InventoryService } = await import('../../lib/inventoryService');
  
  // First, unequip all current items
  const currentInventory = await InventoryService.getBunnyFullInventory(bunny_id);
  const currentSlots = Object.keys(currentInventory.equipment || {});
  
  for (const slot of currentSlots) {
    await InventoryService.unequipSlot(bunny_id, slot as any);
  }
  
  // Debug: check what's in the bunny's inventory
  const fullInventory = await InventoryService.getBunnyFullInventory(bunny_id);

  // Then equip all new items
  for (const item of selected_items) {
    await InventoryService.equipItem(bunny_id, item.item_id);
  }
  
}

export async function POST(request: NextRequest) {
  
  try {
    const body: SaveOutfitRequest = await request.json();
    const { bunny_id, outfit_name, selected_items } = body;

    // For now, skip auth check and use bunny_id as user identifier
    // TODO: Implement proper auth when needed
    const userId = bunny_id; // Use bunny_id as user identifier for now
    
    // Check daily limit before allowing outfit generation  
    try {
      const canGenerate = await OutfitService.checkDailyLimit(userId);
      if (!canGenerate) {
        const usage = await OutfitService.getDailyUsage(userId);
        return NextResponse.json({ 
          error: `Daily outfit limit reached (${usage.used}/${usage.limit}). Try again tomorrow!` 
        }, { status: 429 });
      }
    } catch (limitError) {
      console.warn('⚠️ Daily limit check failed, allowing request:', limitError);
    }


    if (!bunny_id || !outfit_name) {
      console.error('❌ Missing bunny_id or outfit_name');
      return NextResponse.json({ error: 'Missing bunny_id or outfit_name' }, { status: 400 });
    }

    // Get settings
    const selectedBaseBunny = request.headers.get('x-base-bunny') || 'bunny-base.png';
    const selectedScene = request.headers.get('x-scene') || 'meadow';


    // Use the provided outfit name instead of generating one

    // Generate bunny with equipment by calling the existing generation API
    
    // Create a mock request object for the generate-bunny-image function
    const mockRequest = {
      json: async () => ({
        bunnyId: bunny_id,
        equippedItems: selected_items,
        generateAnimation: true,
        forceRegenerate: true
      }),
      headers: {
        get: (key: string) => {
          if (key === 'x-base-bunny') return selectedBaseBunny;
          if (key === 'x-scene') return selectedScene;
          return null;
        }
      }
    } as any;

    // Import and call the POST function directly
    const { POST: generateBunnyImage } = await import('../../api/generate-bunny-image/route');
    const response = await generateBunnyImage(mockRequest);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Gemini generation failed: ${result.error || response.status}`);
    }
    
    // Verify all images actually exist before proceeding
    const cacheKey = await verifyGeneratedImages(selected_items, selectedBaseBunny);

    // Prepare image URLs for outfit storage using the correct cache key
    const baseImagePath = `/generated-bunnies/${cacheKey}`;
    const imageUrls = {
      normal: `${baseImagePath}/normal.png`,
      blink: `${baseImagePath}/blink.png`,
      smile: `${baseImagePath}/smile.png`,
      wave: `${baseImagePath}/wave.png`
    };

    // Save outfit to database with proper user association
    const outfit = await OutfitService.createOutfit({
      bunny_id: bunny_id,
      name: outfit_name,
      equipped_items: selected_items,
      base_bunny: selectedBaseBunny,
      scene: selectedScene,
      image_urls: imageUrls
    }, userId);

    // DON'T apply outfit yet - user will apply it when they accept the notification

    // Increment daily usage counter after successful generation
    try {
      await OutfitService.incrementDailyUsage(userId);
    } catch (counterError) {
      console.error('⚠️ Failed to increment daily counter:', counterError);
      // Don't fail the whole request if counter fails
    }


    return NextResponse.json({
      success: true,
      status: 'completed', // Add explicit status
      outfit_id: outfit.id,
      outfit_name: outfit.name,
      bunny_image_url: result.imageUrl,
      images_verified: true,
      equipment_applied: false,
      message: 'Outfit generated - ready for user to apply'
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

    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const outfitName = response.text().trim();

    // Validate and clean the name
    if (outfitName && outfitName.length <= 50 && outfitName.length > 0) {
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