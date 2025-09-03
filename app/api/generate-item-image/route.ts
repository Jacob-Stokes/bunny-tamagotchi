import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { GeminiImageService } from '../../lib/geminiImageService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, itemName, itemDescription, slot } = body;


    if (!itemId || !itemName || !itemDescription) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if item image already exists
    const itemImagePath = path.join(process.cwd(), 'public', 'items', `${itemId}.png`);
    
    try {
      await require('fs/promises').access(itemImagePath);
      return NextResponse.json({ 
        success: true, 
        imageUrl: `/items/${itemId}.png`,
        cached: true,
        method: 'existing_file'
      });
    } catch {
      // Need to generate item image
    }

    // Create pixel art prompt based on the existing style
    const pixelArtPrompt = `Create a pixel art image of ${itemDescription.toLowerCase()}.

STYLE REQUIREMENTS:
- Pixel art style with clean, bold black outlines
- Bright, vibrant colors with good contrast  
- Simple but detailed pixel art aesthetic
- Item shown clearly on its own
- Completely transparent background
- Similar style to retro 16-bit video game items
- Clean, crisp pixels - no blur or anti-aliasing
- Item should be centered and clearly visible

SPECIFIC ITEM: ${itemName} - ${itemDescription}

The image should show just the ${slot} item itself, nothing else. Make it look like a classic video game inventory icon.`;

    // Generate the item image
    const geminiService = new GeminiImageService();
    const result = await geminiService.generateImage(pixelArtPrompt);
    
    if (!result) {
      throw new Error('Failed to generate item image');
    }

    // Save the item image
    await writeFile(itemImagePath, result.imageData);

    return NextResponse.json({ 
      success: true, 
      imageUrl: `/items/${itemId}.png`,
      cached: false,
      method: 'generated',
      itemId: itemId
    });

  } catch (error) {
    console.error('Item generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate item image' },
      { status: 500 }
    );
  }
}