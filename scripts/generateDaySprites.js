const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function createPlane() {
  const canvas = createCanvas(28, 10);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 28, 10);
  
  // Plane body - passenger jet silhouette
  ctx.fillStyle = '#2D3748'; // Dark gray silhouette
  
  // Main fuselage (longer, more realistic proportions)
  ctx.fillRect(7, 4, 16, 2); // Main body tube
  ctx.fillRect(23, 5, 2, 1); // Rounded nose (pointing right)
  ctx.fillRect(5, 4, 2, 2); // Tail section (now on left)
  
  // Main wings (swept back like passenger jet, now facing right)
  ctx.fillRect(17, 3, 1, 1); // Wing root top
  ctx.fillRect(16, 2, 1, 1); // Wing leading edge (now points forward)
  ctx.fillRect(13, 1, 3, 1); // Wing tip area
  ctx.fillRect(12, 2, 1, 1); // Wing trailing edge
  ctx.fillRect(11, 3, 1, 1); // Wing root
  
  ctx.fillRect(17, 6, 1, 1); // Wing root bottom
  ctx.fillRect(16, 7, 1, 1); // Wing leading edge (now points forward)
  ctx.fillRect(13, 8, 3, 1); // Wing tip area
  ctx.fillRect(12, 7, 1, 1); // Wing trailing edge
  ctx.fillRect(11, 6, 1, 1); // Wing root
  
  // Tail fin (vertical stabilizer, now on left side)
  ctx.fillRect(6, 2, 1, 1); // Tail fin top
  ctx.fillRect(3, 1, 2, 1); // Tail fin peak
  ctx.fillRect(2, 2, 1, 2); // Tail fin back
  ctx.fillRect(3, 4, 1, 1); // Tail fin bottom
  
  // Horizontal stabilizer (tail wings, now on left)
  ctx.fillRect(1, 3, 3, 1); // Horizontal tail
  ctx.fillRect(1, 5, 3, 1); // Horizontal tail bottom
  
  // Engine details (small rectangles on wings)
  ctx.fillStyle = '#1A202C'; // Darker for engines
  ctx.fillRect(14, 2, 1, 1); // Engine pod top
  ctx.fillRect(14, 7, 1, 1); // Engine pod bottom
  
  return canvas.toBuffer('image/png');
}

function createHotAirBalloon(color = '#FF6B9D') {
  const canvas = createCanvas(16, 20);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 16, 20);
  
  // Balloon envelope - simple round shape
  ctx.fillStyle = color;
  
  // Create balloon shape using rectangles (pixel art style)
  ctx.fillRect(5, 1, 6, 1); // Top
  ctx.fillRect(3, 2, 10, 1);
  ctx.fillRect(2, 3, 12, 1);
  ctx.fillRect(1, 4, 14, 1);
  ctx.fillRect(1, 5, 14, 4); // Main body
  ctx.fillRect(2, 9, 12, 1);
  ctx.fillRect(3, 10, 10, 1);
  ctx.fillRect(4, 11, 8, 1);
  ctx.fillRect(5, 12, 6, 1); // Bottom
  
  // Add simple stripes for pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(1, 6, 14, 1); // Light stripe
  
  // Basket
  ctx.fillStyle = '#8B4513'; // Brown basket
  ctx.fillRect(6, 15, 4, 3); // Small basket
  
  // Ropes connecting balloon to basket
  ctx.fillStyle = '#654321'; // Dark brown ropes
  ctx.fillRect(5, 13, 1, 3); // Left rope
  ctx.fillRect(10, 13, 1, 3); // Right rope
  
  return canvas.toBuffer('image/png');
}

function createContrail() {
  const canvas = createCanvas(32, 4);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 32, 4);
  
  // Create contrail - thin wispy trail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Bright center
  ctx.fillRect(24, 1, 8, 2);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillRect(20, 1, 4, 2);
  ctx.fillRect(16, 2, 4, 1);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(12, 2, 4, 1);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(8, 2, 4, 1);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(4, 2, 4, 1);
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 2, 4, 1); // Faintest trail end
  
  return canvas.toBuffer('image/png');
}

// Create air directory if it doesn't exist
const airDir = path.join(process.cwd(), 'public', 'scenes', 'air');
if (!fs.existsSync(airDir)) {
  fs.mkdirSync(airDir, { recursive: true });
}

// Generate sprites
console.log('Creating simple daytime air sprites...');

// Create plane
const plane = createPlane();
fs.writeFileSync(path.join(airDir, 'plane.png'), plane);
console.log('✅ Created: plane.png');

// Create contrail
const contrail = createContrail();
fs.writeFileSync(path.join(airDir, 'contrail.png'), contrail);
console.log('✅ Created: contrail.png');

// Create hot air balloons in different colors
const balloonColors = [
  { name: 'red', color: '#FF6B9D' },
  { name: 'blue', color: '#4A90E2' },
  { name: 'yellow', color: '#FFD700' },
  { name: 'green', color: '#48BB78' },
  { name: 'purple', color: '#9F7AEA' },
  { name: 'orange', color: '#FF8C42' }
];

balloonColors.forEach(balloon => {
  const balloonSprite = createHotAirBalloon(balloon.color);
  fs.writeFileSync(path.join(airDir, `balloon-${balloon.name}.png`), balloonSprite);
  console.log(`✅ Created: balloon-${balloon.name}.png`);
});

console.log('🌤️ Simple daytime air sprites generated successfully!');