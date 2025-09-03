const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function createBird(wingPosition = 'up') {
  const canvas = createCanvas(16, 12);
  const ctx = canvas.getContext('2d');
  
  // Clear background (transparent)
  ctx.clearRect(0, 0, 16, 12);
  
  // Bird color - dark silhouette
  ctx.fillStyle = '#2D3748';
  
  if (wingPosition === 'up') {
    // Wings up position
    // Body
    ctx.fillRect(7, 6, 2, 2); // Small body center
    
    // Left wing (up)
    ctx.fillRect(4, 4, 3, 2);
    ctx.fillRect(5, 5, 2, 2);
    
    // Right wing (up) 
    ctx.fillRect(9, 4, 3, 2);
    ctx.fillRect(9, 5, 2, 2);
    
    // Head/beak
    ctx.fillRect(8, 5, 1, 1);
    
  } else {
    // Wings down position
    // Body
    ctx.fillRect(7, 6, 2, 2); // Small body center
    
    // Left wing (down)
    ctx.fillRect(4, 7, 3, 2);
    ctx.fillRect(5, 6, 2, 2);
    
    // Right wing (down)
    ctx.fillRect(9, 7, 3, 2);
    ctx.fillRect(9, 6, 2, 2);
    
    // Head/beak
    ctx.fillRect(8, 5, 1, 1);
  }
  
  return canvas.toBuffer('image/png');
}

// Create animals directory if it doesn't exist
const animalsDir = path.join(process.cwd(), 'public', 'scenes', 'animals');
if (!fs.existsSync(animalsDir)) {
  fs.mkdirSync(animalsDir, { recursive: true });
}

// Generate bird sprites
console.log('Creating simple pixel birds...');

const birdUp = createBird('up');
const birdDown = createBird('down');

fs.writeFileSync(path.join(animalsDir, 'bird-up.png'), birdUp);
fs.writeFileSync(path.join(animalsDir, 'bird-down.png'), birdDown);

console.log('✅ Created: bird-up.png');
console.log('✅ Created: bird-down.png');
console.log('🐦 Simple pixel birds generated successfully!');