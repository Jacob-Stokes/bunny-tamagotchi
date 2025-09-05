'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedBunnyProps {
  bunnyImageUrl: string;
  className?: string;
  alt?: string;
  debugTrigger?: string | null;
  debugMode?: boolean;
  isSad?: boolean;
}

export default function AnimatedBunny({ bunnyImageUrl, className, alt = "Bunny", debugTrigger, debugMode = false, isSad = false }: AnimatedBunnyProps) {
  console.log('🎭 BlinkingBunny received bunnyImageUrl:', bunnyImageUrl);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [hasBlinkFrame, setHasBlinkFrame] = useState(false);
  const [hasSmileFrame, setHasSmileFrame] = useState(false);
  const [hasWaveFrame, setHasWaveFrame] = useState(false);
  const [hasSadFrames, setHasSadFrames] = useState(false);
  const [sadEyesOpen, setSadEyesOpen] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isChangingOutfit, setIsChangingOutfit] = useState(false);

  // Check if animation frames exist
  useEffect(() => {
    console.log('🎭 BlinkingBunny checking frames for URL:', bunnyImageUrl);
    
    if (!bunnyImageUrl) {
      console.log('🚫 No bunny URL, skipping animation checks');
      setHasBlinkFrame(false);
      setHasSmileFrame(false);
      setHasWaveFrame(false);
      setHasSadFrames(false);
      return;
    }

    // Check if this is a base bunny (no animations except for base-bunnies/bunny-base/ subfolder)
    if (bunnyImageUrl.includes('/base-bunnies/') && !bunnyImageUrl.includes('/bunny-base/')) {
      console.log('🚫 Base bunny URL (no animations), skipping animation checks');
      setHasBlinkFrame(false);
      setHasSmileFrame(false);
      setHasWaveFrame(false);
      setHasSadFrames(false);
      return;
    }

    const checkAnimationFrames = async () => {
      // Determine naming pattern - numbered folders use XXXX-frame.png, others use frame.png
      const isNumberedFolder = /\/\d{4}\//.test(bunnyImageUrl);
      console.log('📁 Is numbered folder?', isNumberedFolder, 'for URL:', bunnyImageUrl);
      
      let blinkUrl, smileUrl, waveUrl, sadClosedUrl, sadOpenUrl;
      
      if (isNumberedFolder) {
        // New numbered format: /generated-bunnies/0001/0001-normal.png or /generated-bunnies/0001/0001-normal.png?v=123
        const folderMatch = bunnyImageUrl.match(/\/(\d{4})\/\d{4}-normal\.png(\?.*)?$/);
        if (folderMatch) {
          const outfitNumber = folderMatch[1];
          const queryParams = folderMatch[2] || ''; // Preserve query parameters
          const basePath = bunnyImageUrl.replace(`/${outfitNumber}-normal.png${queryParams}`, '');
          blinkUrl = `${basePath}/${outfitNumber}-blink.png${queryParams}`;
          smileUrl = `${basePath}/${outfitNumber}-smile.png${queryParams}`;
          waveUrl = `${basePath}/${outfitNumber}-wave.png${queryParams}`;
          sadClosedUrl = `${basePath}/${outfitNumber}-sad-closed-eyes.png${queryParams}`;
          sadOpenUrl = `${basePath}/${outfitNumber}-sad-open-eyes.png${queryParams}`;
        }
      } else {
        // Old cache-key format: /generated-bunnies/base-bunny-clean/normal.png -> blink.png
        blinkUrl = bunnyImageUrl.replace('/normal.png', '/blink.png');
        smileUrl = bunnyImageUrl.replace('/normal.png', '/smile.png');
        waveUrl = bunnyImageUrl.replace('/normal.png', '/wave.png');
        sadClosedUrl = bunnyImageUrl.replace('/normal.png', '/sad-closed-eyes.png');
        sadOpenUrl = bunnyImageUrl.replace('/normal.png', '/sad-open-eyes.png');
      }
      
      console.log('🔍 Animation URLs to check:', { blinkUrl, smileUrl, waveUrl, sadClosedUrl, sadOpenUrl });
      
      // Check blink frame
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve(true);
          };
          img.onerror = () => {
            reject();
          };
          img.src = blinkUrl;
        });
        setHasBlinkFrame(true);
      } catch {
        setHasBlinkFrame(false);
      }
      
      // Check smile frame
      
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve(true);
          };
          img.onerror = () => {
            reject();
          };
          img.src = smileUrl;
        });
        setHasSmileFrame(true);
      } catch {
        setHasSmileFrame(false);
      }
      
      // Check wave frame
      
      try {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            resolve(true);
          };
          img.onerror = () => {
            reject();
          };
          img.src = waveUrl;
        });
        setHasWaveFrame(true);
      } catch {
        setHasWaveFrame(false);
      }
      
      // Check sad frames (both closed and open eyes)
      
      try {
        // Check if both sad frames exist
        const closedImg = new Image();
        const openImg = new Image();
        
        await Promise.all([
          new Promise((resolve, reject) => {
            closedImg.onload = () => resolve(true);
            closedImg.onerror = () => reject();
            closedImg.src = sadClosedUrl;
          }),
          new Promise((resolve, reject) => {
            openImg.onload = () => resolve(true);
            openImg.onerror = () => reject();
            openImg.src = sadOpenUrl;
          })
        ]);
        
        setHasSadFrames(true);
      } catch {
        setHasSadFrames(false);
      }
    };

    checkAnimationFrames();
  }, [bunnyImageUrl]);

  // Sadness animation cycle (when isSad is true)
  useEffect(() => {
    if (!isSad || !hasSadFrames) {
      return;
    }

    const sadnessInterval = setInterval(() => {
      setSadEyesOpen(prev => !prev); // Toggle between open and closed eyes
    }, 2000); // Change every 2 seconds for sad blinking pattern

    return () => {
      clearInterval(sadnessInterval);
    };
  }, [isSad, hasSadFrames]);

  // Natural expression pattern (blink, smile, wave) - disabled when sad
  useEffect(() => {
    if (isSad) {
      return; // No happy expressions when sad
    }
    
    if (!hasBlinkFrame && !hasSmileFrame && !hasWaveFrame) {
      return;
    }

    const scheduleNextExpression = () => {
      // Random interval between 3-6 seconds for natural expressions
      const nextExpressionDelay = Math.random() * 3000 + 3000;
      
      
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
        
        
        if (randomValue < 0.075 && hasWaveFrame) {
          // ~7.5% chance for wave (every ~60 seconds)
          expressionType = 'wave';
          duration = 800;
        } else if (randomValue < 0.3 && hasSmileFrame) {
          // ~22.5% chance for smile (every ~20 seconds)  
          expressionType = 'smile';
          duration = 600;
        } else if (hasBlinkFrame) {
          // ~70% chance for blink
          expressionType = 'blink';
          duration = 200;
        } else {
          // Fallback to whichever frame is available
          if (hasSmileFrame) {
            expressionType = 'smile';
            duration = 600;
          } else if (hasWaveFrame) {
            expressionType = 'wave';
            duration = 800;
          }
        }
        
        
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
          setIsBlinking(false);
          setIsSmiling(false);
          setIsWaving(false);
          scheduleNextExpression(); // Schedule next expression
        }, duration);
      }, nextExpressionDelay);

      return timeoutId;
    };

    const timeoutId = scheduleNextExpression();

    return () => {
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
          
          // Execute the animation using the same function as debug mode
          triggerAnimation(movementType);
          
          // Schedule next animation after a reasonable delay
          setTimeout(() => {
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
      triggerAnimation(animationType);
    }, 100);
  }, [debugTrigger]);

  // Listen for outfit generation events
  useEffect(() => {
    const handleOutfitGenerationStart = () => {
      triggerAnimation('outfit_change');
    };

    const handleOutfitGeneration = (event: any) => {
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
    
    switch (animationType) {
      case 'sway':
        const swayValue = (Math.random() - 0.5) * 6;
        setTranslateX(swayValue);
        break;
      case 'tilt':
        const tiltValue = (Math.random() - 0.5) * 6;
        setRotation(tiltValue);
        break;
      case 'breathe':
        const scaleValue = 0.96 + Math.random() * 0.08;
        setScale(scaleValue);
        break;
      case 'jump':
        setTranslateY(-12);
        setTimeout(() => {
          setTranslateY(0);
        }, 400);
        break;
      case 'shift':
        const shiftX = (Math.random() - 0.5) * 4;
        const shiftRot = (Math.random() - 0.5) * 5;
        setTranslateX(shiftX);
        setRotation(shiftRot);
        break;
      case 'run':
        const exitLeft = Math.random() < 0.5;
        setIsRunning(true);
        
        if (exitLeft) {
          setTranslateX(-600);
          setTimeout(() => {
            // Disable transitions and instantly move to right side
            setIsRunning(false);
            setTranslateX(600);
            setTimeout(() => {
              // Re-enable transitions and run to center
              setIsRunning(true);
              setTranslateX(0);
              setTimeout(() => {
                setIsRunning(false);
              }, 2000);
            }, 100); // Increased delay to ensure teleport happens
          }, 2000);
        } else {
          setTranslateX(600);
          setTimeout(() => {
            // Disable transitions and instantly move to left side
            setIsRunning(false);
            setTranslateX(-600);
            setTimeout(() => {
              // Re-enable transitions and run to center
              setIsRunning(true);
              setTranslateX(0);
              setTimeout(() => {
                setIsRunning(false);
              }, 2000);
            }, 100); // Increased delay to ensure teleport happens
          }, 2000);
        }
        break;
      case 'zoom':
        // Massive scale increase to simulate coming very close
        setScale(8);
        // Slight random position shift to add realism
        setTranslateX((Math.random() - 0.5) * 20);
        setTranslateY((Math.random() - 0.5) * 20);
        setTimeout(() => {
          setScale(1);
          setTranslateX(0);
          setTranslateY(0);
        }, 1500); // Hold the zoom for 1.5 seconds
        break;
      case 'distance':
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
                    }, 150);
                  }, 250);
                }, 200);
              }, 250);
            }, 200);
          }, 300);
        }, 1000);
        break;
      case 'spin':
        setRotation(360);
        setTimeout(() => {
          setRotation(0);
        }, 800);
        break;
      case 'dizzy':
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
                }, 150);
              }, 150);
            }, 200);
          }, 200);
        }, 600);
        break;
      case 'wiggle':
        let wiggleCount = 0;
        const wiggleInterval = setInterval(() => {
          setTranslateX(wiggleCount % 2 === 0 ? -8 : 8);
          wiggleCount++;
          if (wiggleCount >= 8) {
            clearInterval(wiggleInterval);
            setTranslateX(0);
          }
        }, 100);
        break;
      case 'float':
        setTranslateY(-15);
        setTimeout(() => {
          setTranslateY(-25);
          setTimeout(() => {
            setTranslateY(-15);
            setTimeout(() => {
              setTranslateY(-20);
              setTimeout(() => {
                setTranslateY(0);
              }, 400);
            }, 400);
          }, 400);
        }, 400);
        break;
      case 'bounce_ball':
        let bounceCount = 0;
        const bounceInterval = setInterval(() => {
          setTranslateY(-30 + (bounceCount * 5)); // Each bounce gets smaller
          setTimeout(() => {
            setTranslateY(0);
          }, 200);
          bounceCount++;
          if (bounceCount >= 4) {
            clearInterval(bounceInterval);
          }
        }, 400);
        break;
      case 'scared':
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
            }
          }, 80);
        }, 200);
        break;
      case 'sneeze':
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
          }, 300);
        }, 500);
        break;
      case 'peek':
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
            }, 300);
          }, 100);
        }, 500);
        break;
      case 'cartwheel':
        setTranslateX(-100);
        setRotation(0);
        setTimeout(() => {
          setTranslateX(100);
          setRotation(360);
          setTimeout(() => {
            setTranslateX(0);
            setRotation(0);
          }, 800);
        }, 100);
        break;
      case 'sleepy':
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
        setIsChangingOutfit(true);
        
        // Always run left for consistent animation
        const runLeft = true;
        
        // Phase 1: Run off screen left
        setTranslateX(-400);
        
        setTimeout(() => {
          // Phase 2: Stay off screen left (change outfit here)
          setTranslateX(-400);
          
          // Phase 3: Run back on screen from left with new outfit and smile
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
    
    // Determine if this is a numbered folder
    const isNumberedFolder = /\/\d{4}\//.test(baseUrl);
    
    // Priority: sadness > wave > smile > blink > normal
    if (isSad && hasSadFrames && bunnyImageUrl) {
      if (isNumberedFolder) {
        const folderMatch = baseUrl.match(/\/(\d{4})\/\d{4}-normal\.png(\?.*)?$/);
        if (folderMatch) {
          const outfitNumber = folderMatch[1];
          const queryParams = folderMatch[2] || '';
          const basePath = baseUrl.replace(`/${outfitNumber}-normal.png${queryParams}`, '');
          const sadUrl = `${basePath}/${outfitNumber}-${sadEyesOpen ? 'sad-open-eyes' : 'sad-closed-eyes'}.png${queryParams}`;
          console.log('🖼️ Returning sad frame:', sadUrl);
          return sadUrl;
        }
      } else {
        const sadUrl = baseUrl.replace('/normal.png', sadEyesOpen ? '/sad-open-eyes.png' : '/sad-closed-eyes.png');
        console.log('🖼️ Returning sad frame:', sadUrl);
        return sadUrl;
      }
    }
    
    if (hasWaveFrame && isWaving && bunnyImageUrl) {
      if (isNumberedFolder) {
        const folderMatch = baseUrl.match(/\/(\d{4})\/\d{4}-normal\.png(\?.*)?$/);
        if (folderMatch) {
          const outfitNumber = folderMatch[1];
          const queryParams = folderMatch[2] || '';
          const basePath = baseUrl.replace(`/${outfitNumber}-normal.png${queryParams}`, '');
          const waveUrl = `${basePath}/${outfitNumber}-wave.png${queryParams}`;
          console.log('🖼️ Returning wave frame:', waveUrl);
          return waveUrl;
        }
      } else {
        const waveUrl = baseUrl.replace('/normal.png', '/wave.png');
        console.log('🖼️ Returning wave frame:', waveUrl);
        return waveUrl;
      }
    }
    
    if (hasSmileFrame && isSmiling && bunnyImageUrl) {
      if (isNumberedFolder) {
        const folderMatch = baseUrl.match(/\/(\d{4})\/\d{4}-normal\.png(\?.*)?$/);
        if (folderMatch) {
          const outfitNumber = folderMatch[1];
          const queryParams = folderMatch[2] || '';
          const basePath = baseUrl.replace(`/${outfitNumber}-normal.png${queryParams}`, '');
          const smileUrl = `${basePath}/${outfitNumber}-smile.png${queryParams}`;
          console.log('🖼️ Returning smile frame:', smileUrl);
          return smileUrl;
        }
      } else {
        const smileUrl = baseUrl.replace('/normal.png', '/smile.png');
        console.log('🖼️ Returning smile frame:', smileUrl);
        return smileUrl;
      }
    }
    
    if (hasBlinkFrame && isBlinking && bunnyImageUrl) {
      if (isNumberedFolder) {
        const folderMatch = baseUrl.match(/\/(\d{4})\/\d{4}-normal\.png(\?.*)?$/);
        if (folderMatch) {
          const outfitNumber = folderMatch[1];
          const queryParams = folderMatch[2] || '';
          const basePath = baseUrl.replace(`/${outfitNumber}-normal.png${queryParams}`, '');
          const blinkUrl = `${basePath}/${outfitNumber}-blink.png${queryParams}`;
          console.log('🖼️ Returning blink frame:', blinkUrl);
          return blinkUrl;
        }
      } else {
        const blinkUrl = baseUrl.replace('/normal.png', '/blink.png');
        console.log('🖼️ Returning blink frame:', blinkUrl);
        return blinkUrl;
      }
    }
    
    // Use normal frame or fallback
    console.log('🖼️ Returning normal frame:', baseUrl);
    return baseUrl;
  };

  const handleMouseEnter = () => {
    if (hasWaveFrame && !isWaving) {
      setIsWaving(true);
      setTimeout(() => {
        setIsWaving(false);
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