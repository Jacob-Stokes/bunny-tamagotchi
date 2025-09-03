const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Generate 24 hourly sky configurations for smooth transitions with stars
function generateHourlySkies() {
  const skyConfigs = {};
  
  for (let hour = 0; hour < 24; hour++) {
    let colors;
    let starIntensity = 0; // 0 = no stars, 1 = full stars
    let name = `meadow-sky-hour-${hour.toString().padStart(2, '0')}`;
    
    if (hour >= 0 && hour < 4) {
      // Deep night (0-4am) - full stars
      colors = [
        '#0D1B2A', 
        '#1B263B', 
        '#2D3748', 
        '#1A202C'
      ];
      starIntensity = 1.0; // Full brightness stars
    } else if (hour >= 4 && hour < 6) {
      // Pre-dawn (4-6am) - stars fading
      colors = [
        '#1A202C',
        '#2D3748',
        '#4A5568',
        '#2B6CB0'
      ];
      starIntensity = 0.7; // Stars still visible but fading
    } else if (hour >= 6 && hour < 8) {
      // Dawn/Sunrise (6-8am) - very faint stars
      colors = [
        '#FF6B9D',
        '#FF8E85', 
        '#FFB347',
        '#87CEEB'
      ];
      starIntensity = 0.2; // Very faint stars
    } else if (hour >= 8 && hour < 12) {
      // Morning (8am-12pm) - no stars
      colors = [
        '#87CEEB',
        '#B0E0E6',
        '#E0F6FF',
        '#F0FFFF'
      ];
      starIntensity = 0; // No stars
    } else if (hour >= 12 && hour < 16) {
      // Noon/Afternoon (12-4pm) - no stars
      colors = [
        '#4A90E2',
        '#7BB3F0',
        '#A8D8FF',
        '#D0EFFF'
      ];
      starIntensity = 0; // No stars
    } else if (hour >= 16 && hour < 18) {
      // Late afternoon (4-6pm) - no stars
      colors = [
        '#FF8C42',
        '#FFB347',
        '#FFD700',
        '#87CEEB'
      ];
      starIntensity = 0; // No stars
    } else if (hour >= 18 && hour < 20) {
      // Evening/Sunset (6-8pm) - first stars appearing
      colors = [
        '#8B008B',
        '#FF6347',
        '#FF8C00',
        '#FFD700'
      ];
      starIntensity = 0.3; // First stars becoming visible
    } else {
      // Night (8pm-12am) - full stars
      colors = [
        '#191970',
        '#2F4F4F',
        '#483D8B',
        '#1A202C'
      ];
      starIntensity = 1.0; // Full brightness stars
    }
    
    skyConfigs[hour] = { colors, starIntensity, name };
  }
  
  return skyConfigs;
}

const skyConfigs = generateHourlySkies();

function generateRandomStars(width, height, intensity) {
  const stars = [];
  
  if (intensity <= 0) return stars; // No stars
  
  // Number of stars based on intensity
  const baseStarCount = 80;
  const starCount = Math.floor(baseStarCount * intensity);
  
  for (let i = 0; i < starCount; i++) {
    const star = {
      x: Math.random() * width,
      y: Math.random() * height * 0.7, // Stars mainly in upper 70% of sky
      size: Math.random() < 0.1 ? 2 : 1, // 10% chance of bigger stars
      brightness: Math.random() * intensity * 0.8 + intensity * 0.2 // Vary brightness but ensure minimum
    };
    stars.push(star);
  }
  
  return stars;
}

function generateSky(config, width = 400, height = 256) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create vertical gradient for sky
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  
  const colors = config.colors;
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add stars if intensity > 0
  if (config.starIntensity > 0) {
    const stars = generateRandomStars(width, height, config.starIntensity);
    
    stars.forEach(star => {
      const alpha = star.brightness;
      
      if (star.size === 2) {
        // Bigger star - cross pattern
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1); // Center
        ctx.fillStyle = `rgba(255, 255, 240, ${alpha * 0.7})`;
        ctx.fillRect(Math.floor(star.x - 1), Math.floor(star.y), 1, 1); // Left
        ctx.fillRect(Math.floor(star.x + 1), Math.floor(star.y), 1, 1); // Right
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y - 1), 1, 1); // Up
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y + 1), 1, 1); // Down
      } else {
        // Small star - single pixel
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
      }
    });
  }
  
  return canvas.toBuffer('image/png');
}

// Create skies directory if it doesn't exist
const skiesDir = path.join(process.cwd(), 'public', 'scenes', 'skies');
if (!fs.existsSync(skiesDir)) {
  fs.mkdirSync(skiesDir, { recursive: true });
}

// Generate all sky variants with stars
Object.entries(skyConfigs).forEach(([hour, config]) => {
  console.log(`Generating hour ${hour} sky with ${config.starIntensity > 0 ? 'stars' : 'no stars'}...`);
  
  const skyBuffer = generateSky(config);
  const filePath = path.join(skiesDir, `${config.name}.png`);
  
  fs.writeFileSync(filePath, skyBuffer);
  console.log(`✅ Created: ${config.name}.png (star intensity: ${config.starIntensity})`);
});

console.log('🌟 All 24 hourly sky variants with progressive stars generated successfully!');