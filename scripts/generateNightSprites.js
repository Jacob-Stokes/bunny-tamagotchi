const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function createShootingStar() {
  const canvas = createCanvas(24, 8);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 24, 8);
  
  // Create shooting star streak
  // Bright white/yellow center
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(18, 3, 4, 2); // Head of meteor
  
  ctx.fillStyle = '#FFFF88';
  ctx.fillRect(16, 3, 2, 2); // Bright yellow
  ctx.fillRect(14, 4, 2, 1); // Trail getting fainter
  
  ctx.fillStyle = '#FFFF44';
  ctx.fillRect(12, 4, 2, 1);
  
  ctx.fillStyle = '#FFFF22';
  ctx.fillRect(8, 4, 4, 1);
  
  ctx.fillStyle = '#FFFF11';
  ctx.fillRect(4, 4, 4, 1);
  
  ctx.fillStyle = '#FFFF08';
  ctx.fillRect(0, 4, 4, 1); // Faintest trail end
  
  return canvas.toBuffer('image/png');
}

function createUFO() {
  const canvas = createCanvas(20, 12);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 20, 12);
  
  // UFO body - classic saucer shape
  ctx.fillStyle = '#666666'; // Dark gray main body
  
  // Main saucer disc
  ctx.fillRect(4, 6, 12, 3); // Main body
  ctx.fillRect(2, 7, 16, 1); // Wider middle section
  
  // UFO dome/cockpit
  ctx.fillStyle = '#888888'; // Lighter gray dome
  ctx.fillRect(7, 4, 6, 3); // Dome
  ctx.fillRect(8, 3, 4, 1); // Dome top
  
  // Simple lights around the edge
  ctx.fillStyle = '#00FFFF'; // Cyan lights
  ctx.fillRect(3, 8, 1, 1); // Left light
  ctx.fillRect(8, 8, 1, 1); // Left-center light
  ctx.fillRect(11, 8, 1, 1); // Right-center light  
  ctx.fillRect(16, 8, 1, 1); // Right light
  
  // Subtle beam underneath (very faint)
  ctx.fillStyle = '#88FFFF';
  ctx.fillRect(9, 9, 2, 1);
  ctx.fillStyle = '#44FFFF';
  ctx.fillRect(8, 10, 4, 1);
  
  return canvas.toBuffer('image/png');
}

// Create space directory if it doesn't exist
const spaceDir = path.join(process.cwd(), 'public', 'scenes', 'space');
if (!fs.existsSync(spaceDir)) {
  fs.mkdirSync(spaceDir, { recursive: true });
}

// Generate sprites
console.log('Creating simple space sprites...');

const shootingStar = createShootingStar();
const ufo = createUFO();

fs.writeFileSync(path.join(spaceDir, 'shooting-star.png'), shootingStar);
fs.writeFileSync(path.join(spaceDir, 'ufo.png'), ufo);

console.log('✅ Created: shooting-star.png');
console.log('✅ Created: ufo.png');
console.log('🌠 Simple space sprites generated successfully!');