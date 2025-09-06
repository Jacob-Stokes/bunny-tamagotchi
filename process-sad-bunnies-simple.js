const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function removeWhiteBackground(inputPath) {
  const bunnyBuffer = await fs.readFile(inputPath);
  const { data, info } = await sharp(bunnyBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const { width, height, channels } = info;
  const pixelArray = new Uint8Array(data);
  
  // Helper function to check if pixel is background (white, light gray, or medium gray)
  const isBackgroundPixel = (r, g, b) => {
    // Target a broader range: light colors AND gray backgrounds
    const isGrayish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
    const isBright = (r + g + b) / 3 >= 150; // Lower threshold for grays
    return isGrayish && isBright;
  };
  
  // Create a map to track which pixels are background
  const backgroundMap = new Set();
  const visited = new Set();
  
  // Flood fill function to mark background pixels
  const floodFill = (startX, startY) => {
    const stack = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      // Skip if out of bounds or already visited
      if (x < 0 || x >= width || y < 0 || y >= height || visited.has(key)) {
        continue;
      }
      
      visited.add(key);
      
      const i = (y * width + x) * channels;
      const r = pixelArray[i];
      const g = pixelArray[i + 1];
      const b = pixelArray[i + 2];
      
      // If this pixel is background, mark as background and continue flood fill
      if (isBackgroundPixel(r, g, b)) {
        backgroundMap.add(key);
        
        // Add neighbors to stack
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
  };
  
  // Start flood fill from all edge pixels that are white
  // Top and bottom edges
  for (let x = 0; x < width; x++) {
    // Top edge
    const topI = x * channels;
    if (isBackgroundPixel(pixelArray[topI], pixelArray[topI + 1], pixelArray[topI + 2])) {
      floodFill(x, 0);
    }
    
    // Bottom edge
    const bottomI = ((height - 1) * width + x) * channels;
    if (isBackgroundPixel(pixelArray[bottomI], pixelArray[bottomI + 1], pixelArray[bottomI + 2])) {
      floodFill(x, height - 1);
    }
  }
  
  // Left and right edges
  for (let y = 0; y < height; y++) {
    // Left edge
    const leftI = (y * width) * channels;
    if (isBackgroundPixel(pixelArray[leftI], pixelArray[leftI + 1], pixelArray[leftI + 2])) {
      floodFill(0, y);
    }
    
    // Right edge
    const rightI = (y * width + (width - 1)) * channels;
    if (isBackgroundPixel(pixelArray[rightI], pixelArray[rightI + 1], pixelArray[rightI + 2])) {
      floodFill(width - 1, y);
    }
  }
  
  // Apply transparency to background pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const key = `${x},${y}`;
      
      if (backgroundMap.has(key)) {
        pixelArray[i + 3] = 0; // Make transparent
      } else {
        pixelArray[i + 3] = 255; // Ensure non-background is fully opaque
      }
    }
  }
  
  // Convert back to PNG
  return await sharp(Buffer.from(pixelArray), { 
    raw: { width, height, channels } 
  }).png().toBuffer();
}

async function processSadBunnies() {
  console.log('🐰😢 Processing sad bunny images with background removal...\n');
  
  try {
    const wipDir = path.join(process.cwd(), 'public', 'base-bunnies', 'wip');
    const outputDir = path.join(process.cwd(), 'public', 'base-bunnies');
    
    // Input files and their desired output names
    const filesToProcess = [
      {
        input: path.join(wipDir, 'sad-eyes-open.png'),
        output: path.join(outputDir, 'bunny-base-sad-open-eyes.png'),
        name: 'Sad Bunny (Open Eyes)'
      },
      {
        input: path.join(wipDir, 'sad-eyes-closed.png'),
        output: path.join(outputDir, 'bunny-base-sad-closed-eyes.png'),
        name: 'Sad Bunny (Closed Eyes)'
      }
    ];
    
    console.log('📄 Files to process:');
    filesToProcess.forEach((file, index) => {
      console.log(`  ${index + 1}. ${path.basename(file.input)} → ${path.basename(file.output)}`);
    });
    
    console.log('\n🔧 Processing with background removal...');
    
    for (const file of filesToProcess) {
      try {
        console.log(`\n📸 Processing ${file.name}...`);
        
        // Check if input file exists
        await fs.access(file.input);
        console.log(`  ✅ Found input file: ${path.basename(file.input)}`);
        
        // Apply background removal
        console.log(`  🎨 Applying background removal...`);
        const transparentBuffer = await removeWhiteBackground(file.input);
        
        // Save the processed image
        await fs.writeFile(file.output, transparentBuffer);
        console.log(`  💾 Saved: ${path.basename(file.output)}`);
        
        // Get file size for verification
        const stats = await fs.stat(file.output);
        const fileSizeKB = Math.round(stats.size / 1024);
        console.log(`  📊 Size: ${fileSizeKB} KB`);
        
      } catch (error) {
        console.error(`  ❌ Error processing ${file.name}:`, error.message);
      }
    }
    
    console.log('\n✅ Sad bunny processing completed!');
    console.log('\n📁 New base bunny files:');
    console.log('   /base-bunnies/bunny-base-sad-open-eyes.png');
    console.log('   /base-bunnies/bunny-base-sad-closed-eyes.png');
    console.log('\n🎯 These can now be used in the generation process as alternative base bunnies!');
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

processSadBunnies();