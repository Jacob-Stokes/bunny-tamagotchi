interface EquippedItem {
  item_id: string;
  slot: string;
  image_url: string;
  name: string;
}

export class CacheUtils {
  // Generate cache key for bunny with items (client-side safe version)
  static getBunnyItemsCacheKey(equippedItems: EquippedItem[], baseBunnyFile: string = 'bunny-base.png'): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    const baseBunnyName = baseBunnyFile.replace('.png', '');
    return sortedItems.length > 0 
      ? `${baseBunnyName}_${sortedItems}`
      : `${baseBunnyName}`;
  }

  // Generate cache key including scene (for composite images)
  static getCompositeCacheKey(equippedItems: EquippedItem[], baseBunnyFile: string = 'bunny-base.png', sceneId: string = 'meadow'): string {
    const sortedItems = equippedItems
      .sort((a, b) => a.item_id.localeCompare(b.item_id))
      .map(item => item.item_id)
      .join(',');
    const baseBunnyName = baseBunnyFile.replace('.png', '');
    return sortedItems.length > 0 
      ? `bunny_gemini_${baseBunnyName}_${sceneId}_${sortedItems}`
      : `bunny_gemini_${baseBunnyName}_${sceneId}`;
  }
}