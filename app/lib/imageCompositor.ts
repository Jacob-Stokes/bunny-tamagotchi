import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

interface SlotPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

class ImageCompositor {
  // Define positioning for each slot relative to bunny image
  private slotPositions: Record<string, SlotPosition> = {
    head: { x: 50, y: 20, width: 150, height: 150 },
    face: { x: 75, y: 80, width: 100, height: 50 },
    upper_body: { x: 60, y: 150, width: 130, height: 100 },
    lower_body: { x: 70, y: 220, width: 110, height: 80 },
    feet: { x: 80, y: 280, width: 90, height: 50 },
    accessory: { x: 20, y: 100, width: 60, height: 60 },
  };

  private baseBunnyPath = path.join(process.cwd(), 'public', 'base-bunny-transparent.png');

  async compositeImage(equippedItems: EquippedItem[]): Promise<Buffer> {
    try {
      // Load base bunny image
      let composite = sharp(this.baseBunnyPath);
      
      // Get base image metadata to ensure proper sizing
      const { width: baseWidth, height: baseHeight } = await composite.metadata();
      
      if (!baseWidth || !baseHeight) {
        throw new Error('Could not read base bunny image dimensions');
      }

      // Create layers array for Sharp composite
      const layers: sharp.OverlayOptions[] = [];

      // Process each equipped item
      for (const item of equippedItems) {
        const itemPath = this.getItemPath(item.image_url);
        
        try {
          // Check if item image exists
          await fs.access(itemPath);
          
          // Get slot position
          const position = this.slotPositions[item.slot];
          if (!position) {
            console.warn(`No position defined for slot: ${item.slot}`);
            continue;
          }

          // Resize item to fit slot if dimensions are specified
          let itemBuffer;
          if (position.width && position.height) {
            itemBuffer = await sharp(itemPath)
              .resize(position.width, position.height, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
              })
              .png()
              .toBuffer();
          } else {
            itemBuffer = await sharp(itemPath).png().toBuffer();
          }

          // Add to composite layers
          layers.push({
            input: itemBuffer,
            top: position.y,
            left: position.x,
          });

          console.log(`Added ${item.name} to composite at position (${position.x}, ${position.y})`);

        } catch (error) {
          console.warn(`Could not load item image: ${item.image_url}`, error);
          continue;
        }
      }

      // Apply all layers to the base bunny
      if (layers.length > 0) {
        composite = composite.composite(layers);
      }

      // Return the final composed image as PNG buffer
      const result = await composite.png().toBuffer();
      
      console.log(`Successfully composed bunny with ${layers.length} items`);
      return result;

    } catch (error) {
      console.error('Error compositing bunny image:', error);
      throw error;
    }
  }

  private getItemPath(imageUrl: string): string {
    if (imageUrl.startsWith('/items/')) {
      return path.join(process.cwd(), 'public', imageUrl);
    }
    throw new Error(`Unsupported image URL format: ${imageUrl}`);
  }

  // Generate cache key for item combination
  static getCacheKey(equippedItems: EquippedItem[]): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    return `bunny_${sortedItems}`;
  }

  // Update slot positions (can be called to adjust positioning)
  updateSlotPosition(slot: string, position: SlotPosition): void {
    this.slotPositions[slot] = position;
  }

  // Get current slot positions (useful for debugging)
  getSlotPositions(): Record<string, SlotPosition> {
    return { ...this.slotPositions };
  }
}

export default new ImageCompositor();