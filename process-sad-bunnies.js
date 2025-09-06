const fs = require('fs').promises;
const path = require('path');

// Import the SceneCompositor background removal function
const { SceneCompositor } = require('./app/lib/sceneCompositor');

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
    
    console.log('\\n🔧 Processing with background removal pipeline...');
    
    for (const file of filesToProcess) {
      try {
        console.log(`\\n📸 Processing ${file.name}...`);
        
        // Check if input file exists
        await fs.access(file.input);
        console.log(`  ✅ Found input file: ${path.basename(file.input)}`);
        
        // Apply background removal using the same pipeline as the generation process
        console.log(`  🎨 Applying background removal...`);
        const transparentBuffer = await SceneCompositor.removeWhiteBackground(file.input);
        
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
    
    console.log('\\n✅ Sad bunny processing completed!');
    console.log('\\n📁 New base bunny files:');
    console.log('   /base-bunnies/bunny-base-sad-open-eyes.png');
    console.log('   /base-bunnies/bunny-base-sad-closed-eyes.png');
    console.log('\\n🎯 These can now be used in the generation process as alternative base bunnies!');
    
  } catch (error) {
    console.error('❌ Processing failed:', error);
    process.exit(1);
  }
}

processSadBunnies();