'use client';

import { useEffect, useState } from 'react';

interface Cloud {
  id: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  image: string;
}

interface Bird {
  id: number;
  x: number;
  y: number;
  speed: number;
  wingFlap: boolean;
  fadingOut: boolean;
}

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  fadingOut: boolean;
}

interface UFO {
  id: number;
  x: number;
  y: number;
  speed: number;
  fadingOut: boolean;
}

interface AnimatedMeadowSceneProps {
  children?: React.ReactNode;
  hour?: number;
  wardrobeMode?: boolean;
}

type SceneType = 'outdoor' | 'indoor';

export default function AnimatedMeadowScene({ children, hour = 12, wardrobeMode = false }: AnimatedMeadowSceneProps) {
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [ufos, setUfos] = useState<UFO[]>([]);
  const [scene, setScene] = useState<SceneType>('outdoor');
  const [currentSkyHour, setCurrentSkyHour] = useState<number>(hour);
  const [nextSkyHour, setNextSkyHour] = useState<number>(hour);
  const [skyTransitioning, setSkyTransitioning] = useState<boolean>(false);
  
  // Initialize sky properly on mount
  useEffect(() => {
    setCurrentSkyHour(hour);
    setNextSkyHour(hour);
  }, []); // Only run once on mount

  useEffect(() => {
    // Generate clouds with spacing to avoid bunching
    const generateSpacedClouds = (): Cloud[] => {
      const clouds: Cloud[] = [];
      const minDistance = 120; // Increased minimum distance between clouds
      
      for (let i = 0; i < 12; i++) {
        let attempts = 0;
        let validPosition = false;
        let newCloud: Cloud;
        
        while (!validPosition && attempts < 50) {
          const cloudType = Math.random() > 0.5 ? 'cloud1' : 'cloud2';
          const x = Math.random() * 500 - 50;
          const y = Math.random() * 80 + 5;
          
          let speed, size, opacity;
          
          // Mix of normal and giant clouds
          if (Math.random() < 0.4) {
            // Giant slow-moving clouds (40% chance)
            speed = Math.random() * 0.08 + 0.05;
            size = Math.random() * 120 + 160;
            opacity = Math.random() * 0.2 + 0.8; // More opaque giant clouds
          } else {
            // Regular massive clouds
            speed = Math.random() * 0.15 + 0.1;
            size = Math.random() * 60 + 80;
            opacity = Math.random() * 0.25 + 0.85; // More opaque regular clouds
          }
          
          newCloud = { id: i + 1, x, y, speed, size, opacity, image: cloudType };
          
          // Check if this cloud is far enough from existing clouds
          validPosition = clouds.every(existingCloud => {
            const distance = Math.sqrt(
              Math.pow(newCloud.x - existingCloud.x, 2) + 
              Math.pow(newCloud.y - existingCloud.y, 2)
            );
            return distance >= minDistance;
          });
          
          attempts++;
        }
        
        if (validPosition || attempts >= 50) {
          clouds.push(newCloud);
        }
      }
      
      return clouds;
    };

    const initialClouds = generateSpacedClouds();
    
    setClouds(initialClouds);

    const animateClouds = () => {
      setClouds(prevClouds => {
        // Move all clouds to the right
        let updatedClouds = prevClouds.map(cloud => ({
          ...cloud,
          x: cloud.x + cloud.speed
        }));
        
        // Remove clouds that have moved completely off screen
        updatedClouds = updatedClouds.filter(cloud => cloud.x < 500);
        
        // Only generate new clouds if we're below 8 (less frequent generation)
        if (updatedClouds.length < 8) {
          const newId = Math.max(...updatedClouds.map(c => c.id), 0) + 1;
          const cloudType = Math.random() > 0.5 ? 'cloud1' : 'cloud2';
          const x = Math.random() * 50 - 80; // Start off-screen left
          const y = Math.random() * 80 + 5;
          const speed = Math.random() * 0.3 + 0.05;
          const size = Math.random() * 40 + 30;
          const opacity = Math.random() * 0.3 + 0.7; // More opaque new clouds
          
          // Simplified distance check - just check closest 3 clouds
          const newCloud = { id: newId, x, y, speed, size, opacity, image: cloudType };
          const sortedClouds = updatedClouds.sort((a, b) => Math.abs(a.x - newCloud.x) - Math.abs(b.x - newCloud.x));
          const tooClose = sortedClouds.slice(0, 3).some(existingCloud => {
            const distance = Math.abs(newCloud.x - existingCloud.x) + Math.abs(newCloud.y - existingCloud.y);
            return distance < 140; // Increased spacing for new clouds too
          });
          
          if (!tooClose) {
            updatedClouds.push(newCloud);
          }
        }
        
        return updatedClouds;
      });
    };

    const interval = setInterval(animateClouds, 100); // Reduced to 10fps
    return () => clearInterval(interval);
  }, []);

  // Bird animation effect
  useEffect(() => {
    const animateBirds = () => {
      setBirds(prevBirds => {
        const isDayTime = hour >= 6 && hour < 20; // Birds active 6am-8pm
        
        // Move birds and toggle wing flap
        let updatedBirds = prevBirds.map(bird => ({
          ...bird,
          x: bird.x + bird.speed,
          wingFlap: !bird.wingFlap, // Simple wing flap toggle
          fadingOut: bird.fadingOut || !isDayTime // Start fading if it becomes night
        }));
        
        // Remove birds that have flown off screen OR finished fading out
        updatedBirds = updatedBirds.filter(bird => bird.x < 500 && !(bird.fadingOut && bird.x > -10));
        
        // Only spawn new birds during day time
        if (isDayTime && Math.random() < 0.08 && updatedBirds.filter(b => !b.fadingOut).length < 3) {
          const newBird: Bird = {
            id: Math.max(...updatedBirds.map(b => b.id), 0) + 1,
            x: -20, // Start off-screen left
            y: Math.random() * 60 + 20, // Random height in upper sky
            speed: Math.random() * 2 + 1.6, // Speed between 1.6-3.6 (twice as fast as before)
            wingFlap: Math.random() > 0.5,
            fadingOut: false
          };
          updatedBirds.push(newBird);
        }
        
        return updatedBirds;
      });
    };

    const birdInterval = setInterval(animateBirds, 300); // Slower animation for birds
    return () => clearInterval(birdInterval);
  }, [hour]);

  // Shooting stars animation effect (nighttime only)
  useEffect(() => {
    const animateShootingStars = () => {
      setShootingStars(prevStars => {
        const isNightTime = hour >= 20 || hour < 6; // Night from 8pm to 6am
        
        // Move shooting stars diagonally
        let updatedStars = prevStars.map(star => ({
          ...star,
          x: star.x + star.speedX,
          y: star.y + star.speedY,
          fadingOut: star.fadingOut || !isNightTime
        }));
        
        // Remove stars that have moved off screen
        updatedStars = updatedStars.filter(star => star.x < 500 && star.y < 300 && !(star.fadingOut && star.x > -30));
        
        // Spawn new shooting stars (more frequent for testing)
        if (isNightTime && Math.random() < 0.15 && updatedStars.filter(s => !s.fadingOut).length < 2) {
          const newStar: ShootingStar = {
            id: Math.max(...updatedStars.map(s => s.id), 0) + 1,
            x: -30, // Start off-screen left
            y: Math.random() * 100 + 10, // Random height in upper area
            speedX: Math.random() * 3 + 2, // Fast horizontal movement
            speedY: Math.random() * 1 + 0.5, // Slight downward movement
            fadingOut: false
          };
          updatedStars.push(newStar);
        }
        
        return updatedStars;
      });
    };

    const starInterval = setInterval(animateShootingStars, 150); // Fast movement
    return () => clearInterval(starInterval);
  }, [hour]);

  // UFO animation effect (nighttime only)
  useEffect(() => {
    const animateUfos = () => {
      setUfos(prevUfos => {
        const isNightTime = hour >= 20 || hour < 6;
        
        // Move UFOs horizontally
        let updatedUfos = prevUfos.map(ufo => ({
          ...ufo,
          x: ufo.x + ufo.speed,
          fadingOut: ufo.fadingOut || !isNightTime
        }));
        
        // Remove UFOs that have moved off screen
        updatedUfos = updatedUfos.filter(ufo => ufo.x < 500 && !(ufo.fadingOut && ufo.x > -25));
        
        // Spawn new UFOs (rare, but more frequent for testing)
        if (isNightTime && Math.random() < 0.05 && updatedUfos.filter(u => !u.fadingOut).length < 1) {
          const newUfo: UFO = {
            id: Math.max(...updatedUfos.map(u => u.id), 0) + 1,
            x: -25, // Start off-screen left
            y: Math.random() * 80 + 30, // Random height in middle-upper area
            speed: Math.random() * 3 + 4, // Fast zippy movement! 4-7px per frame
            fadingOut: false
          };
          updatedUfos.push(newUfo);
        }
        
        return updatedUfos;
      });
    };

    const ufoInterval = setInterval(animateUfos, 100); // Fast smooth movement like shooting stars
    return () => clearInterval(ufoInterval);
  }, [hour]);

  // Sky transition effect
  useEffect(() => {
    if (hour !== currentSkyHour) {
      setNextSkyHour(hour);
      setSkyTransitioning(true);
      
      // After transition completes, update current sky
      const timeout = setTimeout(() => {
        setCurrentSkyHour(hour);
        setSkyTransitioning(false);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [hour, currentSkyHour]);

  const handleHouseClick = () => {
    setScene(scene === 'outdoor' ? 'indoor' : 'outdoor');
  };

  if (scene === 'indoor') {
    // Indoor bedroom scene - choose day or night version
    const isNightTime = hour >= 20 || hour < 6; // Night from 8pm to 6am
    const bedroomImage = isNightTime ? 'bedroom1-night.png' : 'bedroom1.png';
    
    return (
      <div className="w-full h-64 relative overflow-hidden rounded-2xl">
        {/* Indoor background */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url(/scenes/indoor/${bedroomImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1
          }}
        />
        
        {/* Back to outdoor button */}
        <button
          onClick={handleHouseClick}
          className="absolute top-2 left-2 bg-white/80 hover:bg-white/90 rounded-full p-2 text-sm transition-colors z-10"
          title="Go outside"
        >
          🏠→🌳
        </button>
        
        {/* Content (bunny, etc.) */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
          {children}
        </div>
      </div>
    );
  }

  // Wardrobe mode - simple white background
  if (wardrobeMode) {
    return (
      <div className="w-full h-64 relative overflow-hidden rounded-2xl bg-white">
        {/* Content (bunny for wardrobe) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    );
  }

  // Outdoor meadow scene
  return (
    <div className="w-full h-64 relative overflow-hidden rounded-2xl">
      {/* 1. Background sky - furthest back - two layers for smooth transitions */}
      {/* Current sky layer */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(/scenes/skies/meadow-sky-hour-${currentSkyHour.toString().padStart(2, '0')}.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1
        }}
      />
      {/* Next sky layer - fades in during transitions */}
      <div 
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(/scenes/skies/meadow-sky-hour-${nextSkyHour.toString().padStart(2, '0')}.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: skyTransitioning ? 1 : 0,
          zIndex: 1
        }}
      />
      
      {/* 2. Sun/Moon - behind everything else */}
      {(() => {
        // Calculate sun/moon position based on hour
        // Sun visible 5am-7pm (14 hours), Moon visible 5pm-7am (14 hours with overlap)
        const isSunTime = hour >= 5 && hour < 19;
        const isMoonTime = hour >= 17 || hour < 7;
        
        // Determine which to show (sun takes priority during overlap)
        const celestialBody = isSunTime ? 'sun' : 'moon';
        const showCelestial = isSunTime || isMoonTime;
        
        // Calculate position along arc (0-1)
        let progress;
        if (isSunTime) {
          // Sun arc from 5am to 7pm (14 hours)
          progress = (hour - 5) / 14;
        } else if (isMoonTime) {
          // Moon arc from 5pm to 7am (14 hours, wrapping around)
          if (hour >= 17) {
            // Evening: 5pm (17) to 11pm (23) -> 0 to 6/14 progress
            progress = (hour - 17) / 14;
          } else {
            // Early morning: 12am (0) to 7am (7) -> 7/14 to 13/14 progress  
            progress = (hour + 7) / 14;
          }
        } else {
          progress = 0; // Fallback
        }
        
        // Calculate arc position (sine wave for realistic movement)
        const xProgress = progress; // Linear horizontal movement
        const yProgress = Math.sin(progress * Math.PI); // Arc height
        
        // Size varies with position (larger at horizon, smaller at peak) - much bigger
        const baseSize = 160;
        const size = baseSize - (yProgress * 50); // Even bigger overall
        
        // Position within container - start from behind house, arc across to right side
        const houseLeft = 0; // House starts at left edge
        const houseWidth = 66; // House is 66px wide  
        const containerWidth = 400; // Assumed container width
        // Account for sun/moon size - center the image on the path
        const rawX = houseLeft + (xProgress * containerWidth); // Raw position along path
        const x = rawX - (size / 2); // Offset by half the size to center the image
        
        // Adjust positioning based on celestial body (moon might need different offset)
        let yOffset = size / 2; // Default center offset
        if (celestialBody === 'moon') {
          yOffset = size / 2 + 10; // Moon might need to be positioned slightly lower
        }
        const y = 250 - (yProgress * 230) - yOffset;
        
        // Debug logging for moon positioning
        if (!isSunTime && isMoonTime) {
          console.log(`Moon at hour ${hour}: progress=${progress.toFixed(3)}, yProgress=${yProgress.toFixed(3)}, y=${(y + size/2).toFixed(1)}`);
        }
        
        // Only show if we should show celestial bodies and they're above horizon
        // Lower threshold so moon starts/ends as low as sun
        const isVisible = showCelestial && yProgress > 0.01;
        
        return isVisible ? (
          <div
            className="absolute transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(/scenes/celestial/${celestialBody}.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              left: `${x}px`,
              top: `${y}px`,
              width: `${size}px`,
              height: `${size}px`,
              transform: 'translateZ(0)',
              zIndex: 2,
              opacity: 0.4 // Make even fainter
            }}
          />
        ) : null;
      })()}
      
      {/* 3. Animated clouds - behind scenery and bunny */}
      {clouds.map(cloud => {
        // Dynamic cloud lighting based on time of day
        let cloudFilter = '';
        let cloudOpacity = cloud.opacity;
        
        // Adjust opacity for night time - clouds more visible at night
        if (hour >= 18 || hour < 6) {
          cloudOpacity = Math.min(1.0, cloud.opacity * 1.3); // Boost night opacity by 30%
        }
        
        if (hour >= 0 && hour < 4) {
          // Deep night - dark blue tint, but keep clouds visible
          cloudFilter = 'brightness(0.6) sepia(1) hue-rotate(200deg) saturate(2)';
          cloudOpacity *= 0.9; // Much more visible at night
        } else if (hour >= 4 && hour < 6) {
          // Pre-dawn - purple tint, faint
          cloudFilter = 'brightness(0.5) sepia(1) hue-rotate(260deg) saturate(1.5)';
          cloudOpacity *= 0.5;
        } else if (hour >= 6 && hour < 8) {
          // Dawn - warm pink/orange tint
          cloudFilter = 'brightness(1.1) sepia(0.8) hue-rotate(320deg) saturate(1.3)';
          cloudOpacity *= 0.9;
        } else if (hour >= 8 && hour < 16) {
          // Day - bright white
          cloudFilter = 'brightness(1.2)';
          cloudOpacity *= 1.0;
        } else if (hour >= 16 && hour < 18) {
          // Late afternoon - warm golden tint
          cloudFilter = 'brightness(1.1) sepia(0.3) hue-rotate(30deg) saturate(1.2)';
          cloudOpacity *= 0.95;
        } else if (hour >= 18 && hour < 20) {
          // Evening/sunset - orange/red tint
          cloudFilter = 'brightness(0.9) sepia(0.7) hue-rotate(15deg) saturate(1.5)';
          cloudOpacity *= 0.8;
        } else {
          // Night - dark blue tint
          cloudFilter = 'brightness(0.6) sepia(1) hue-rotate(220deg) saturate(2)';
          cloudOpacity *= 0.9; // Much more visible at night
        }
        
        return (
          <div
            key={cloud.id}
            className="absolute transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(/scenes/skies/${cloud.image}.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              left: `${cloud.x}px`,
              top: `${cloud.y}px`,
              width: `${cloud.size}px`,
              height: `${cloud.size * 0.75}px`, // Maintain aspect ratio
              opacity: cloudOpacity,
              transform: 'translateZ(0)', // Hardware acceleration
              filter: cloudFilter,
              zIndex: 3
            }}
          />
        );
      })}
      
      {/* 4a. Flying birds in the distance (daytime) */}
      {birds.map(bird => (
        <div
          key={bird.id}
          className="absolute transition-opacity duration-2000 ease-out"
          style={{
            backgroundImage: `url(/scenes/animals/bird-${bird.wingFlap ? 'up' : 'down'}.png)`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            left: `${bird.x}px`,
            top: `${bird.y}px`,
            width: '16px',
            height: '12px',
            transform: 'translateZ(0)',
            zIndex: 2, // Behind clouds but in front of sun/moon
            opacity: bird.fadingOut ? 0 : 0.7
          }}
        />
      ))}
      
      {/* 4b. Shooting stars (nighttime) */}
      {shootingStars.map(star => (
        <div
          key={star.id}
          className="absolute transition-opacity duration-1000 ease-out"
          style={{
            backgroundImage: 'url(/scenes/space/shooting-star.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: '24px',
            height: '8px',
            transform: 'translateZ(0)',
            zIndex: 1, // Behind everything except sky
            opacity: star.fadingOut ? 0 : 0.9
          }}
        />
      ))}
      
      {/* 4c. UFOs (nighttime) */}
      {ufos.map(ufo => (
        <div
          key={ufo.id}
          className="absolute transition-opacity duration-2000 ease-out"
          style={{
            backgroundImage: 'url(/scenes/space/ufo.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            left: `${ufo.x}px`,
            top: `${ufo.y}px`,
            width: '20px',
            height: '12px',
            transform: 'translateZ(0)',
            zIndex: 2, // Same level as birds
            opacity: ufo.fadingOut ? 0 : 0.8
          }}
        />
      ))}
      
      {/* 5. Foreground scenery overlay - hides sun/moon when below horizon */}
      {(() => {
        // Dynamic scenery lighting based on time of day
        let sceneryFilter = '';
        let sceneryOpacity = 1.0;
        
        if (hour >= 6 && hour < 8) {
          // Dawn - very subtle warm tint
          sceneryFilter = 'brightness(0.98) sepia(0.03) hue-rotate(30deg) saturate(1.02)';
        } else if (hour >= 8 && hour < 16) {
          // Day - natural
          sceneryFilter = 'brightness(1.0)';
        } else if (hour >= 16 && hour < 20) {
          // Afternoon/evening - very subtle golden/orange tint
          sceneryFilter = 'brightness(0.98) sepia(0.04) hue-rotate(15deg) saturate(1.03)';
        } else {
          // Night/other times - just slightly darker, no color tinting
          sceneryFilter = 'brightness(0.9)';
        }
        
        return (
          <div 
            className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: 'url(/scenes/overlays/meadow-house-transparent.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: sceneryFilter,
              opacity: sceneryOpacity,
              zIndex: 4
            }}
          />
        );
      })()}
      
      {/* 5. Content (bunny, etc.) - on top of everything */}
      {(() => {
        // Dynamic bunny lighting based on time of day
        let bunnyFilter = '';
        
        if (hour >= 6 && hour < 8) {
          // Dawn - extremely subtle warm tint
          bunnyFilter = 'brightness(0.99) sepia(0.015) hue-rotate(30deg) saturate(1.01)';
        } else if (hour >= 8 && hour < 16) {
          // Day - natural
          bunnyFilter = 'brightness(1.0)';
        } else if (hour >= 16 && hour < 20) {
          // Afternoon/evening - extremely subtle golden/orange tint
          bunnyFilter = 'brightness(0.99) sepia(0.02) hue-rotate(15deg) saturate(1.015)';
        } else {
          // Night/other times - just slightly darker, no color tinting
          bunnyFilter = 'brightness(0.92)';
        }
        
        return (
          <div 
            className="absolute inset-0 flex items-center justify-center transition-all duration-1000 ease-in-out" 
            style={{ 
              zIndex: 5,
              filter: bunnyFilter
            }}
          >
            {children}
          </div>
        );
      })()}
      
      {/* 6. Clickable house area */}
      <div
        onClick={handleHouseClick}
        className="absolute cursor-pointer hover:bg-blue-200/20 transition-colors rounded-lg"
        style={{
          left: '0px',     // Touching left edge of box
          top: '110px',    // Nudged down slightly
          width: '66px',   // 66% of original size
          height: '66px',
          zIndex: 6
        }}
        title="Enter house"
      />
    </div>
  );
}