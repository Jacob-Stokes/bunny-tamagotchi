'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedBunnyProps {
  bunnyImageUrl: string;
  className?: string;
  alt?: string;
  debugTrigger?: string | null;
  debugMode?: boolean;
}

export default function AnimatedBunny({ bunnyImageUrl, className, alt = "Bunny", debugTrigger, debugMode = false }: AnimatedBunnyProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [hasBlinkFrame, setHasBlinkFrame] = useState(false);
  const [hasSmileFrame, setHasSmileFrame] = useState(false);
  const [hasWaveFrame, setHasWaveFrame] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isChangingOutfit, setIsChangingOutfit] = useState(false);

  // Check if animation frames exist
  useEffect(() => {
    if (!bunnyImageUrl || !bunnyImageUrl.includes('/generated-bunnies/')) {
      setHasBlinkFrame(false);
      setHasSmileFrame(false);
      setHasWaveFrame(false);
      return;
    }

    const checkAnimationFrames = async () => {
      // Check blink frame
      const blinkUrl = bunnyImageUrl.replace('/normal.png', '/blink.png');
      console.log('🔍 Checking for blink frame:', blinkUrl);
      
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('✅ Blink frame available');
            resolve(true);
          };
          img.onerror = () => {
            console.log('❌ Blink frame not found');
            reject();
          };
          img.src = blinkUrl;
        });
        setHasBlinkFrame(true);
      } catch {
        setHasBlinkFrame(false);
      }
      
      // Check smile frame
      const smileUrl = bunnyImageUrl.replace('/normal.png', '/smile.png');
      console.log('🔍 Checking for smile frame:', smileUrl);
      
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('✅ Smile frame available');
            resolve(true);
          };
          img.onerror = () => {
            console.log('❌ Smile frame not found');
            reject();
          };
          img.src = smileUrl;
        });
        setHasSmileFrame(true);
      } catch {
        setHasSmileFrame(false);
      }
      
      // Check wave frame
      const waveUrl = bunnyImageUrl.replace('/normal.png', '/wave.png');
      console.log('🔍 Checking for wave frame:', waveUrl);
      
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('✅ Wave frame available');
            resolve(true);
          };
          img.onerror = () => {
            console.log('❌ Wave frame not found');
            reject();
          };
          img.src = waveUrl;
        });
        setHasWaveFrame(true);
      } catch {
        setHasWaveFrame(false);
      }
    };

    checkAnimationFrames();
  }, [bunnyImageUrl]);

  // Natural expression pattern (blink, smile, wave)
  useEffect(() => {
    console.log(`🧐 Expression effect triggered - hasBlinkFrame: ${hasBlinkFrame}, hasSmileFrame: ${hasSmileFrame}, hasWaveFrame: ${hasWaveFrame}`);
    
    if (!hasBlinkFrame && !hasSmileFrame && !hasWaveFrame) {
      console.log('❌ No expression frames available, skipping natural expressions');
      return;
    }

    const scheduleNextExpression = () => {
      // Random interval between 3-6 seconds for natural expressions
      const nextExpressionDelay = Math.random() * 3000 + 3000;
      
      console.log(`⏰ Next expression in ${Math.round(nextExpressionDelay)}ms`);
      
      const timeoutId = setTimeout(() => {
        // Choose expression type with rarity
        const randomValue = Math.random();
        let expressionType = 'blink';
        let duration = 200;
        
        // New probabilities: Wave every ~60s, Smile every ~20s
        // With 3-6s intervals (avg 4.5s), we need:
        // Wave: 4.5s / 60s = 0.075 (7.5% chance)
        // Smile: 4.5s / 20s = 0.225 (22.5% chance) 
        // Blink: remaining 70%
        
        console.log(`🎲 Random value: ${randomValue.toFixed(3)} (Wave<0.075, Smile<0.3, else Blink)`);
        
        if (randomValue < 0.075 && hasWaveFrame) {
          // ~7.5% chance for wave (every ~60 seconds)
          expressionType = 'wave';
          duration = 800;
          console.log('👋 Selected WAVE animation (~7.5% chance, every ~60s)');
        } else if (randomValue < 0.3 && hasSmileFrame) {
          // ~22.5% chance for smile (every ~20 seconds)  
          expressionType = 'smile';
          duration = 600;
          console.log('😊 Selected SMILE animation (~22.5% chance, every ~20s)');
        } else if (hasBlinkFrame) {
          // ~70% chance for blink
          expressionType = 'blink';
          duration = 200;
          console.log('👁️ Selected BLINK animation (~70% chance)');
        } else {
          // Fallback to whichever frame is available
          if (hasSmileFrame) {
            expressionType = 'smile';
            duration = 600;
            console.log('😊 Fallback to SMILE (no blink frame)');
          } else if (hasWaveFrame) {
            expressionType = 'wave';
            duration = 800;
            console.log('👋 Fallback to WAVE (no blink/smile frames)');
          }
        }
        
        console.log(`✨ ${expressionType.toUpperCase()} expression starting now! Duration: ${duration}ms`);
        
        // Set the appropriate expression state
        if (expressionType === 'blink') {
          setIsBlinking(true);
        } else if (expressionType === 'smile') {
          setIsSmiling(true);
        } else if (expressionType === 'wave') {
          setIsWaving(true);
        }
        
        // Reset after duration
        setTimeout(() => {
          console.log(`👁️ Expression ${expressionType.toUpperCase()} ended, scheduling next`);
          setIsBlinking(false);
          setIsSmiling(false);
          setIsWaving(false);
          scheduleNextExpression(); // Schedule next expression
        }, duration);
      }, nextExpressionDelay);

      return timeoutId;
    };

    console.log('🎬 Starting natural expression scheduling');
    const timeoutId = scheduleNextExpression();

    return () => {
      console.log('🛑 Cleaning up expression scheduling');
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasBlinkFrame, hasSmileFrame, hasWaveFrame]);

  // Natural movement animation (disabled in debug mode)
  useEffect(() => {
    if (debugMode) return; // Skip natural animations in debug mode
    
    const scheduleNextMovement = () => {
      // Random interval between 6-12 seconds for subtle movements
      const nextMovementDelay = Math.random() * 6000 + 6000;
      
      const timeoutId = setTimeout(() => {
        // Choose random movement type with different rarities
        const randomValue = Math.random();
        
        // Very rare animations (2% each)
        const veryRareAnimations = ['run', 'zoom', 'distance', 'dizzy', 'cartwheel'];
        // Rare animations (3% each) 
        const rareAnimations = ['spin', 'wiggle', 'scared', 'peek', 'sleepy'];
        // Uncommon animations (5% each)
        const uncommonAnimations = ['float', 'bounce_ball', 'sneeze'];
        // Common animations (remaining %)
        const commonAnimations = ['sway', 'tilt', 'breathe', 'jump', 'shift'];
        
        let movementType;
        
        if (randomValue < 0.10) {
          // 10% chance for very rare (2% each)
          movementType = veryRareAnimations[Math.floor(Math.random() * veryRareAnimations.length)];
        } else if (randomValue < 0.25) {
          // 15% chance for rare (3% each)  
          movementType = rareAnimations[Math.floor(Math.random() * rareAnimations.length)];
        } else if (randomValue < 0.40) {
          // 15% chance for uncommon (5% each)
          movementType = uncommonAnimations[Math.floor(Math.random() * uncommonAnimations.length)];
        } else {
          // 60% chance for common animations
          movementType = commonAnimations[Math.floor(Math.random() * commonAnimations.length)];
        }
        
        // Reset to neutral first
        setRotation(0);
        setTranslateX(0);
        setTranslateY(0);
        setScale(1);
        
        // Apply movement after brief reset
        setTimeout(() => {
          console.log('🎭 Natural animation:', movementType);
          
          // Execute the animation using the same function as debug mode
          triggerAnimation(movementType);
          
          // Schedule next animation after a reasonable delay
          setTimeout(() => {
            console.log('🔄 Scheduling next natural animation');
            scheduleNextMovement();
          }, getAnimationDuration(movementType));
        }, 100);
      }, nextMovementDelay);

      return timeoutId;
    };

    const timeoutId = scheduleNextMovement();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [debugMode]);

  // Get animation duration for scheduling
  const getAnimationDuration = (animationType: string): number => {
    switch (animationType) {
      case 'sway':
      case 'tilt': 
      case 'breathe':
      case 'shift':
        return 2000;
      case 'jump':
        return 2000;
      case 'run':
      case 'zoom':
      case 'distance':
        return 4500;
      case 'spin':
        return 800;
      case 'dizzy':
        return 1500;
      case 'wiggle':
        return 800;
      case 'float':
        return 1600;
      case 'bounce_ball':
        return 1600;
      case 'scared':
        return 1000;
      case 'sneeze':
        return 800;
      case 'peek':
        return 1200;
      case 'cartwheel':
        return 900;
      case 'sleepy':
        return 2500;
      default:
        return 2000;
    }
  };

  // Debug trigger effect
  useEffect(() => {
    if (!debugTrigger) return;

    console.log('🎮 Debug trigger received:', debugTrigger);
    
    // Reset to neutral first
    setRotation(0);
    setTranslateX(0);
    setTranslateY(0);
    setScale(1);
    setIsRunning(false);
    
    // Apply debug animation after brief reset
    setTimeout(() => {
      // Extract animation type from trigger (format: "animationType-timestamp")
      const animationType = debugTrigger.split('-')[0];
      console.log('🎯 Extracted animation type:', animationType);
      triggerAnimation(animationType);
    }, 100);
  }, [debugTrigger]);

  // Listen for outfit generation events
  useEffect(() => {
    const handleOutfitGenerationStart = () => {
      console.log('👗 Outfit generation started - triggering zoom out animation');
      triggerAnimation('outfit_change');
    };

    const handleOutfitGeneration = (event: any) => {
      console.log('👗 Outfit generation event received:', event.detail);
      if (event.detail.fromOutfitAcceptance) {
        // Don't trigger animation for outfit acceptance, it's already pre-generated
        return;
      }
      triggerAnimation('outfit_change');
    };

    window.addEventListener('outfit-generation-start', handleOutfitGenerationStart);
    window.addEventListener('bunny-outfit-applied', handleOutfitGeneration);

    return () => {
      window.removeEventListener('outfit-generation-start', handleOutfitGenerationStart);
      window.removeEventListener('bunny-outfit-applied', handleOutfitGeneration);
    };
  }, []);

  const triggerAnimation = (animationType: string) => {
    console.log('🎯 Executing triggerAnimation for:', animationType);
    
    switch (animationType) {
      case 'sway':
        const swayValue = (Math.random() - 0.5) * 6;
        console.log('↔️ Setting translateX to:', swayValue);
        setTranslateX(swayValue);
        break;
      case 'tilt':
        const tiltValue = (Math.random() - 0.5) * 6;
        console.log('🔄 Setting rotation to:', tiltValue);
        setRotation(tiltValue);
        break;
      case 'breathe':
        const scaleValue = 0.96 + Math.random() * 0.08;
        console.log('💨 Setting scale to:', scaleValue);
        setScale(scaleValue);
        break;
      case 'jump':
        console.log('⬆️ Setting translateY to -12');
        setTranslateY(-12);
        setTimeout(() => {
          console.log('⬇️ Resetting translateY to 0');
          setTranslateY(0);
        }, 400);
        break;
      case 'shift':
        const shiftX = (Math.random() - 0.5) * 4;
        const shiftRot = (Math.random() - 0.5) * 5;
        console.log('🎭 Setting shift - translateX:', shiftX, 'rotation:', shiftRot);
        setTranslateX(shiftX);
        setRotation(shiftRot);
        break;
      case 'run':
        const exitLeft = Math.random() < 0.5;
        console.log('🏃 Running animation - exit left:', exitLeft);
        setIsRunning(true);
        
        if (exitLeft) {
          console.log('🏃 Phase 1: Running off screen to left (-600px)');
          setTranslateX(-600);
          setTimeout(() => {
            console.log('🏃 Phase 2: Teleporting to right side (600px) with no transition');
            // Disable transitions and instantly move to right side
            setIsRunning(false);
            setTranslateX(600);
            setTimeout(() => {
              console.log('🏃 Phase 3: Running back to center from right side');
              // Re-enable transitions and run to center
              setIsRunning(true);
              setTranslateX(0);
              setTimeout(() => {
                console.log('🏃 Phase 4: Animation complete');
                setIsRunning(false);
              }, 2000);
            }, 100); // Increased delay to ensure teleport happens
          }, 2000);
        } else {
          console.log('🏃 Phase 1: Running off screen to right (600px)');
          setTranslateX(600);
          setTimeout(() => {
            console.log('🏃 Phase 2: Teleporting to left side (-600px) with no transition');
            // Disable transitions and instantly move to left side
            setIsRunning(false);
            setTranslateX(-600);
            setTimeout(() => {
              console.log('🏃 Phase 3: Running back to center from left side');
              // Re-enable transitions and run to center
              setIsRunning(true);
              setTranslateX(0);
              setTimeout(() => {
                console.log('🏃 Phase 4: Animation complete');
                setIsRunning(false);
              }, 2000);
            }, 100); // Increased delay to ensure teleport happens
          }, 2000);
        }
        break;
      case 'zoom':
        console.log('📷 Zoom up animation - coming super close!');
        // Massive scale increase to simulate coming very close
        setScale(8);
        // Slight random position shift to add realism
        setTranslateX((Math.random() - 0.5) * 20);
        setTranslateY((Math.random() - 0.5) * 20);
        setTimeout(() => {
          console.log('📷 Zoom back to normal');
          setScale(1);
          setTranslateX(0);
          setTranslateY(0);
        }, 1500); // Hold the zoom for 1.5 seconds
        break;
      case 'distance':
        console.log('🎯 Distance animation - going far away then hopping back!');
        // Phase 1: Shrink to very small (far distance)
        setScale(0.1);
        setTimeout(() => {
          // Phase 2: Start coming back with first big hop
          setScale(0.4);
          setTranslateY(-50); // Much bigger hop
          setTimeout(() => {
            setTranslateY(0);
            setTimeout(() => {
              // Phase 3: Second hop, getting bigger
              setScale(0.7);
              setTranslateY(-40); // Big hop
              setTimeout(() => {
                setTranslateY(0);
                setTimeout(() => {
                  // Phase 4: Third hop, almost normal size
                  setScale(1.1);
                  setTranslateY(-30); // Still visible hop
                  setTimeout(() => {
                    setTranslateY(0);
                    setTimeout(() => {
                      // Phase 5: Final settle to normal
                      setScale(1);
                      console.log('🎯 Distance animation complete - hopped back!');
                    }, 150);
                  }, 250);
                }, 200);
              }, 250);
            }, 200);
          }, 300);
        }, 1000);
        break;
      case 'spin':
        console.log('🌪️ Spin animation - 360 degree rotation!');
        setRotation(360);
        setTimeout(() => {
          setRotation(0);
          console.log('🌪️ Spin complete');
        }, 800);
        break;
      case 'dizzy':
        console.log('🫨 Dizzy animation - fast spin then wobble!');
        // Fast spin
        setRotation(720); // Two full rotations
        setTimeout(() => {
          // Wobble recovery
          setRotation(-10);
          setTimeout(() => {
            setRotation(8);
            setTimeout(() => {
              setRotation(-5);
              setTimeout(() => {
                setRotation(2);
                setTimeout(() => {
                  setRotation(0);
                  console.log('🫨 Dizzy complete');
                }, 150);
              }, 150);
            }, 200);
          }, 200);
        }, 600);
        break;
      case 'wiggle':
        console.log('🪩 Wiggle animation - rapid shaking!');
        let wiggleCount = 0;
        const wiggleInterval = setInterval(() => {
          setTranslateX(wiggleCount % 2 === 0 ? -8 : 8);
          wiggleCount++;
          if (wiggleCount >= 8) {
            clearInterval(wiggleInterval);
            setTranslateX(0);
            console.log('🪩 Wiggle complete');
          }
        }, 100);
        break;
      case 'float':
        console.log('☁️ Float animation - gentle floating!');
        setTranslateY(-15);
        setTimeout(() => {
          setTranslateY(-25);
          setTimeout(() => {
            setTranslateY(-15);
            setTimeout(() => {
              setTranslateY(-20);
              setTimeout(() => {
                setTranslateY(0);
                console.log('☁️ Float complete');
              }, 400);
            }, 400);
          }, 400);
        }, 400);
        break;
      case 'bounce_ball':
        console.log('🏀 Bounce ball animation!');
        let bounceCount = 0;
        const bounceInterval = setInterval(() => {
          setTranslateY(-30 + (bounceCount * 5)); // Each bounce gets smaller
          setTimeout(() => {
            setTranslateY(0);
          }, 200);
          bounceCount++;
          if (bounceCount >= 4) {
            clearInterval(bounceInterval);
            console.log('🏀 Bounce complete');
          }
        }, 400);
        break;
      case 'scared':
        console.log('😱 Scared animation - jump back and tremble!');
        // Jump back
        setTranslateX(-20);
        setTranslateY(-10);
        setTimeout(() => {
          setTranslateY(0);
          // Tremble
          let trembleCount = 0;
          const trembleInterval = setInterval(() => {
            setTranslateX(-20 + (trembleCount % 2 === 0 ? -2 : 2));
            trembleCount++;
            if (trembleCount >= 10) {
              clearInterval(trembleInterval);
              setTranslateX(0);
              console.log('😱 Scared complete');
            }
          }, 80);
        }, 200);
        break;
      case 'sneeze':
        console.log('🤧 Sneeze animation!');
        // Build up
        setTranslateX(-3);
        setTimeout(() => {
          // Sneeze forward
          setTranslateX(15);
          setScale(0.9);
          setTimeout(() => {
            // Settle back
            setTranslateX(0);
            setScale(1);
            console.log('🤧 Sneeze complete');
          }, 300);
        }, 500);
        break;
      case 'peek':
        console.log('🎭 Peek-a-boo animation!');
        // Exit left
        setTranslateX(-400);
        setTimeout(() => {
          // Appear right
          setTranslateX(400);
          setTimeout(() => {
            // Peek in from right
            setTranslateX(200);
            setTimeout(() => {
              // Come back to center
              setTranslateX(0);
              console.log('🎭 Peek-a-boo complete');
            }, 300);
          }, 100);
        }, 500);
        break;
      case 'cartwheel':
        console.log('🎪 Cartwheel animation!');
        setTranslateX(-100);
        setRotation(0);
        setTimeout(() => {
          setTranslateX(100);
          setRotation(360);
          setTimeout(() => {
            setTranslateX(0);
            setRotation(0);
            console.log('🎪 Cartwheel complete');
          }, 800);
        }, 100);
        break;
      case 'sleepy':
        console.log('😴 Sleepy animation - nodding off!');
        // First nod
        setRotation(15);
        setTimeout(() => {
          setRotation(0);
          setTimeout(() => {
            // Second deeper nod
            setRotation(25);
            setTimeout(() => {
              setRotation(0);
              setTimeout(() => {
                // Final slow nod
                setRotation(30);
                setTimeout(() => {
                  setRotation(0);
                  console.log('😴 Sleepy complete');
                }, 600);
              }, 300);
            }, 400);
          }, 300);
        }, 800);
        break;
      case 'blink':
        if (hasBlinkFrame) {
          setIsBlinking(true);
          setTimeout(() => setIsBlinking(false), 200);
        }
        break;
      case 'smile':
        if (hasSmileFrame) {
          setIsSmiling(true);
          setTimeout(() => setIsSmiling(false), 600);
        }
        break;
      case 'wave':
        if (hasWaveFrame) {
          setIsWaving(true);
          setTimeout(() => setIsWaving(false), 800);
        }
        break;
      case 'outfit_change':
        console.log('👗 Outfit change animation - run off screen to change!');
        setIsChangingOutfit(true);
        
        // Choose random direction (left or right)
        const runLeft = Math.random() < 0.5;
        console.log('🏃 Running off screen -', runLeft ? 'left' : 'right');
        
        // Phase 1: Run off screen
        setTranslateX(runLeft ? -400 : 400);
        
        setTimeout(() => {
          // Phase 2: Teleport to opposite side (off screen)
          setTranslateX(runLeft ? 400 : -400);
          
          // Phase 3: Run back on screen with new outfit and smile
          setTimeout(() => {
            setTranslateX(0);
            if (hasSmileFrame) {
              setIsSmiling(true);
              setTimeout(() => setIsSmiling(false), 1000);
            }
            setIsChangingOutfit(false);
          }, 100);
        }, 800);
        break;
    }
  };

  const getCurrentImageUrl = () => {
    // Fallback to default if bunnyImageUrl is empty or undefined
    const baseUrl = bunnyImageUrl || '/base-bunnies/bunny-base.png';
    
    // Priority: wave > smile > blink > normal
    if (hasWaveFrame && isWaving && bunnyImageUrl) {
      return baseUrl.replace('/normal.png', '/wave.png');
    }
    
    if (hasSmileFrame && isSmiling && bunnyImageUrl) {
      return baseUrl.replace('/normal.png', '/smile.png');
    }
    
    if (hasBlinkFrame && isBlinking && bunnyImageUrl) {
      return baseUrl.replace('/normal.png', '/blink.png');
    }
    
    // Use normal frame or fallback
    return baseUrl;
  };

  const handleMouseEnter = () => {
    if (hasWaveFrame && !isWaving) {
      console.log('👋 Mouse hover detected - triggering instant wave!');
      setIsWaving(true);
      setTimeout(() => {
        setIsWaving(false);
        console.log('👋 Hover wave ended');
      }, 800);
    }
  };

  return (
    <img 
      src={getCurrentImageUrl()} 
      alt={alt}
      className={className}
      onMouseEnter={handleMouseEnter}
      style={{ 
        transition: isRunning ? 'transform 2s ease-in-out' : 'transform 0.8s ease-in-out', // Slower transition for running
        transform: `rotate(${rotation}deg) translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
        cursor: hasWaveFrame ? 'pointer' : 'default'
      }}
    />
  );
}