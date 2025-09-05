# Code Changes Needed for Junction Table Architecture

## 1. API Route Changes (`/api/generated-outfits/route.ts`)

### CURRENT (Broken):
```typescript
// Gets all outfits, then filters manually
const { data: outfits } = await supabase
  .from('outfits') 
  .select('*')
  .order('created_at', { ascending: false });

// Manual filtering by bunny_id and user_id
accessibleOutfits = outfits?.filter((outfit: any) => 
  outfit.name === 'Base Bunny' || 
  outfit.bunny_id === bunnyId || 
  outfit.user_id === requestingUserId
) || [];
```

### NEW (Proper):
```typescript
// Gets only outfits the bunny owns via JOIN
const { data: outfits } = await supabase
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
```

## 2. Outfit Switching Logic (`Wardrobe.tsx`)

### CURRENT (Manual sync):
```typescript
// Apply items to bunny equipment FIRST
await applyItemsToBunny(items);

// Save as active outfit
await OutfitService.setActiveOutfit(outfit.outfitId, bunnyState.id);
```

### NEW (Junction table):
```typescript
// Switch active outfit (single update)
await supabase
  .from('bunny_outfits')
  .update({ is_active: false })
  .eq('bunny_id', bunnyId);

await supabase
  .from('bunny_outfits')
  .update({ is_active: true })
  .eq('bunny_id', bunnyId)
  .eq('outfit_id', outfitId);

// Equipment table gets updated automatically via trigger or service
```

## 3. Equipment Loading (`InventoryService.ts`)

### CURRENT (Direct equipment):
```typescript
const { data: equipmentData } = await supabase
  .from('bunny_equipment')
  .select('*, item:items(*)')
  .eq('bunny_id', bunnyId);
```

### NEW (From active outfit):
```typescript
const { data: equipmentData } = await supabase
  .from('outfit_items')
  .select(`
    *,
    item:items(*),
    outfit:outfits!inner(
      bunny_outfits!inner(bunny_id, is_active)
    )
  `)
  .eq('outfit.bunny_outfits.bunny_id', bunnyId)
  .eq('outfit.bunny_outfits.is_active', true);
```

## 4. Outfit Creation (New outfits)

### CURRENT (JSON blob):
```typescript
const outfit = {
  bunny_id: bunnyId,
  equipped_items: [...], // JSON array
  is_active: true
};
```

### NEW (Normalized):
```typescript
// 1. Create outfit
const { data: outfit } = await supabase
  .from('outfits')
  .insert({ name, user_id, image_urls })
  .select()
  .single();

// 2. Create outfit items
await supabase
  .from('outfit_items')
  .insert(items.map(item => ({
    outfit_id: outfit.id,
    item_id: item.id,
    slot: item.slot
  })));

// 3. Give to bunny
await supabase
  .from('bunny_outfits')
  .insert({
    bunny_id: bunnyId,
    outfit_id: outfit.id,
    is_active: true
  });
```

## 5. Benefits After Changes

✅ **Single source of truth**: Equipment comes from active outfit
✅ **Easy queries**: JOINs instead of manual filtering  
✅ **Outfit sharing**: Multiple bunnies can own same outfit
✅ **Atomic updates**: Switching outfits is single operation
✅ **Data integrity**: Foreign keys prevent orphaned data

## Migration Strategy

1. Run SQL to create new tables
2. Migrate existing data
3. Update code incrementally:
   - Start with outfit loading API
   - Then outfit switching logic  
   - Finally equipment loading
4. Test thoroughly
5. Remove old columns once stable