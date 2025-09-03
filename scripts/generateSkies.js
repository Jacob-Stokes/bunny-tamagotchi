const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Generate 24 hourly sky configurations for smooth transitions
function generateHourlySkies() {
  const skyConfigs = {};
  
  for (let hour = 0; hour < 24; hour++) {
    let colors;
    let name = `meadow-sky-hour-${hour.toString().padStart(2, '0')}`;
    
    if (hour >= 0 && hour < 4) {
      // Deep night (0-4am)
      const intensity = (4 - hour) / 4;
      colors = [
        '#0D1B2A', 
        '#1B263B', 
        '#2D3748', 
        '#1A202C'
      ];
    } else if (hour >= 4 && hour < 6) {
      // Pre-dawn (4-6am)
      const progress = (hour - 4) / 2;
      colors = [
        '#1A202C',
        '#2D3748',
        '#4A5568',
        '#2B6CB0'
      ];
    } else if (hour >= 6 && hour < 8) {
      // Dawn/Sunrise (6-8am)
      const progress = (hour - 6) / 2;
      colors = [
        '#FF6B9D',
        '#FF8E85', 
        '#FFB347',
        '#87CEEB'
      ];
    } else if (hour >= 8 && hour < 12) {
      // Morning (8am-12pm)
      const progress = (hour - 8) / 4;
      colors = [
        '#87CEEB',
        '#B0E0E6',
        '#E0F6FF',
        '#F0FFFF'
      ];
    } else if (hour >= 12 && hour < 16) {
      // Noon/Afternoon (12-4pm)
      colors = [
        '#4A90E2',
        '#7BB3F0',
        '#A8D8FF',
        '#D0EFFF'
      ];
    } else if (hour >= 16 && hour < 18) {
      // Late afternoon (4-6pm)
      const progress = (hour - 16) / 2;
      colors = [
        '#FF8C42',
        '#FFB347',
        '#FFD700',
        '#87CEEB'
      ];
    } else if (hour >= 18 && hour < 20) {
      // Evening/Sunset (6-8pm)
      const progress = (hour - 18) / 2;
      colors = [
        '#8B008B',
        '#FF6347',
        '#FF8C00',
        '#FFD700'
      ];
    } else {
      // Night (8pm-12am)
      const progress = (hour - 20) / 4;
      colors = [
        '#191970',
        '#2F4F4F',
        '#483D8B',
        '#1A202C'
      ];
    }
    
    skyConfigs[hour] = { colors, name };
  }
  
  return skyConfigs;
}

const skyConfigs = generateHourlySkies();

function generateSky(config, width = 400, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create vertical gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  
  const colors = config.colors;
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toBuffer('image/png');
}

// Create skies directory if it doesn't exist
const skiesDir = path.join(process.cwd(), 'public', 'scenes', 'skies');
if (!fs.existsSync(skiesDir)) {
  fs.mkdirSync(skiesDir, { recursive: true });
}

// Generate all sky variants
Object.entries(skyConfigs).forEach(([hour, config]) => {
  console.log(`Generating hour ${hour} sky...`);
  
  const skyBuffer = generateSky(config);
  const filePath = path.join(skiesDir, `${config.name}.png`);
  
  fs.writeFileSync(filePath, skyBuffer);
  console.log(`✅ Created: ${config.name}.png`);
});

console.log('🌅 All 24 hourly sky variants generated successfully!');