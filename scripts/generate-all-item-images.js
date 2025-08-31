const fetch = require('node-fetch');

// All the new items we added (the ones that need images)
const NEW_ITEMS = [
  // HEAD ITEMS
  { id: 'crown', name: 'Royal Golden Crown', description: 'A majestic golden crown fit for royalty', slot: 'head' },
  { id: 'pirate_hat', name: 'Swashbuckling Pirate Hat', description: 'A classic tricorn pirate hat with feather', slot: 'head' },
  { id: 'chef_hat', name: 'Professional Chef Hat', description: 'A tall white chef\'s toque', slot: 'head' },
  { id: 'winter_hat', name: 'Warm Winter Hat', description: 'A cozy winter hat with ear flaps', slot: 'head' },
  { id: 'beret', name: 'Artistic Beret', description: 'A stylish black beret for creative types', slot: 'head' },
  { id: 'cowboy_hat', name: 'Classic Cowboy Hat', description: 'A traditional brown cowboy hat', slot: 'head' },
  
  // FACE ITEMS
  { id: 'cat_eye_glasses', name: 'Retro Cat Eye Glasses', description: 'Stylish cat eye frame glasses', slot: 'face' },
  { id: '3d_glasses', name: '3D Cinema Glasses', description: 'Classic red and blue 3D glasses', slot: 'face' },
  { id: 'eye_patch', name: 'Mysterious Eye Patch', description: 'A black eye patch for that pirate look', slot: 'face' },
  { id: 'masquerade_mask', name: 'Elegant Masquerade Mask', description: 'A ornate mask for fancy occasions', slot: 'face' },
  { id: 'safety_goggles', name: 'Science Safety Goggles', description: 'Clear protective goggles for experiments', slot: 'face' },
  
  // UPPER BODY ITEMS
  { id: 'tuxedo', name: 'Formal Tuxedo', description: 'An elegant black tuxedo', slot: 'upper_body' },
  { id: 'lab_coat', name: 'Scientist Lab Coat', description: 'A crisp white laboratory coat', slot: 'upper_body' },
  { id: 'denim_jacket', name: 'Classic Denim Jacket', description: 'A timeless blue denim jacket', slot: 'upper_body' },
  { id: 'hawaiian_shirt', name: 'Tropical Hawaiian Shirt', description: 'A colorful shirt with tropical prints', slot: 'upper_body' },
  { id: 'superhero_cape', name: 'Heroic Red Cape', description: 'A flowing red cape for heroes', slot: 'upper_body' },
  { id: 'raincoat', name: 'Yellow Raincoat', description: 'A bright yellow raincoat', slot: 'upper_body' },
  { id: 'varsity_jacket', name: 'School Varsity Jacket', description: 'A classic letterman jacket', slot: 'upper_body' },
  
  // LOWER BODY ITEMS
  { id: 'blue_jeans', name: 'Classic Blue Jeans', description: 'Comfortable blue denim jeans', slot: 'lower_body' },
  { id: 'dress_pants', name: 'Formal Dress Pants', description: 'Sharp black dress pants', slot: 'lower_body' },
  { id: 'cargo_shorts', name: 'Practical Cargo Shorts', description: 'Shorts with lots of pockets', slot: 'lower_body' },
  { id: 'pleated_skirt', name: 'School Pleated Skirt', description: 'A classic pleated school skirt', slot: 'lower_body' },
  { id: 'tutu', name: 'Ballet Tutu', description: 'A frilly pink ballet tutu', slot: 'lower_body' },
  { id: 'leather_pants', name: 'Cool Leather Pants', description: 'Black leather pants for that rock star look', slot: 'lower_body' },
  
  // FEET ITEMS
  { id: 'sneakers', name: 'Comfortable Sneakers', description: 'Classic white athletic sneakers', slot: 'feet' },
  { id: 'dress_shoes', name: 'Polished Dress Shoes', description: 'Shiny black formal shoes', slot: 'feet' },
  { id: 'rain_boots', name: 'Yellow Rain Boots', description: 'Bright yellow rubber boots for puddles', slot: 'feet' },
  { id: 'cowboy_boots', name: 'Leather Cowboy Boots', description: 'Classic brown leather cowboy boots', slot: 'feet' },
  { id: 'ballet_slippers', name: 'Pink Ballet Slippers', description: 'Delicate pink ballet shoes', slot: 'feet' },
  { id: 'flip_flops', name: 'Beach Flip Flops', description: 'Casual beach flip flops', slot: 'feet' },
  { id: 'hiking_boots', name: 'Sturdy Hiking Boots', description: 'Durable boots for outdoor adventures', slot: 'feet' },
  { id: 'high_heels', name: 'Elegant High Heels', description: 'Stylish black high heel shoes', slot: 'feet' },
  
  // ACCESSORY ITEMS
  { id: 'backpack', name: 'Adventure Backpack', description: 'A practical backpack for adventures', slot: 'accessory' },
  { id: 'pearl_necklace', name: 'Elegant Pearl Necklace', description: 'A classic string of pearls', slot: 'accessory' },
  { id: 'gold_watch', name: 'Luxury Gold Watch', description: 'An expensive gold wristwatch', slot: 'accessory' },
  { id: 'rubber_duck', name: 'Cute Rubber Duck', description: 'A squeaky yellow rubber duck companion', slot: 'accessory' },
  { id: 'magic_wand', name: 'Sparkly Magic Wand', description: 'A wand that sparkles with magical energy', slot: 'accessory' },
  { id: 'teddy_bear', name: 'Cuddly Teddy Bear', description: 'A soft brown teddy bear for comfort', slot: 'accessory' },
  { id: 'bowtie', name: 'Dapper Bow Tie', description: 'A classic black bow tie', slot: 'accessory' },
  { id: 'flower_crown', name: 'Daisy Flower Crown', description: 'A crown made of fresh daisies', slot: 'accessory' }
];

async function generateItemImage(item) {
  console.log(`🎨 Generating image for ${item.name}...`);
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-item-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId: item.id,
        itemName: item.name,
        itemDescription: item.description,
        slot: item.slot
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${item.name} - ${result.cached ? 'Already exists' : 'Generated'}`);
      return { success: true, item: item.id, cached: result.cached };
    } else {
      console.log(`❌ ${item.name} - Failed: ${result.error}`);
      return { success: false, item: item.id, error: result.error };
    }
  } catch (error) {
    console.log(`❌ ${item.name} - Error: ${error.message}`);
    return { success: false, item: item.id, error: error.message };
  }
}

async function generateAllItems() {
  console.log(`🚀 Starting generation of ${NEW_ITEMS.length} item images...\n`);
  
  const results = [];
  let successful = 0;
  let failed = 0;
  let cached = 0;

  // Generate items one by one to avoid API rate limits
  for (let i = 0; i < NEW_ITEMS.length; i++) {
    const item = NEW_ITEMS[i];
    console.log(`[${i + 1}/${NEW_ITEMS.length}] Processing ${item.name}...`);
    
    const result = await generateItemImage(item);
    results.push(result);
    
    if (result.success) {
      if (result.cached) {
        cached++;
      } else {
        successful++;
      }
    } else {
      failed++;
    }
    
    // Small delay between requests to be nice to the API
    if (i < NEW_ITEMS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🎯 GENERATION COMPLETE!');
  console.log(`✅ Successfully generated: ${successful}`);
  console.log(`📋 Already existed: ${cached}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${NEW_ITEMS.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed items:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.item}: ${r.error}`);
    });
  }
}

// Run the generation
generateAllItems().catch(console.error);