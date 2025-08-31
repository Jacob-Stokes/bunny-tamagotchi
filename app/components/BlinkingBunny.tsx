'use client';

import React, { useState, useEffect } from 'react';

interface AnimatedBunnyProps {
  bunnyImageUrl: string;
  className?: string;
  alt?: string;
  debugTrigger?: string | null;
}

export default function AnimatedBunny({ bunnyImageUrl, className, alt = "Bunny", debugTrigger }: AnimatedBunnyProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [hasBlinkFrame, setHasBlinkFrame] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isRunning, setIsRunning] = useState(false);

  // Check if blink frames exist
  useEffect(() => {
    if (!bunnyImageUrl || !bunnyImageUrl.includes('/generated-bunnies/')) {
      setHasBlinkFrame(false);
      return;
    }

    const checkBlinkFrames = async () => {
      // Check regular blink frame
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
    };

    checkBlinkFrames();
  }, [bunnyImageUrl]);

  // Natural blinking pattern
  useEffect(() => {
    if (!hasBlinkFrame) return;

    const scheduleNextBlink = () => {
      // Random interval between 3-6 seconds for natural blinking
      const nextBlinkDelay = Math.random() * 3000 + 3000;
      
      console.log(`⏰ Next blink in ${nextBlinkDelay}ms`);
      
      const timeoutId = setTimeout(() => {
        console.log('👀 Blinking now!');
        setIsBlinking(true);
        
        // Blink duration: 200ms (quick and natural)
        setTimeout(() => {
          console.log('👁️ Eyes open');
          setIsBlinking(false);
          scheduleNextBlink(); // Schedule next blink
        }, 200);
      }, nextBlinkDelay);

      return timeoutId;
    };

    const timeoutId = scheduleNextBlink();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasBlinkFrame]);

  // Natural movement animation
  useEffect(() => {
    const scheduleNextMovement = () => {
      // Random interval between 6-12 seconds for subtle movements
      const nextMovementDelay = Math.random() * 6000 + 6000;
      
      const timeoutId = setTimeout(() => {
        // Choose random movement type - running and zoom are very rare (5% chance each)
        const randomValue = Math.random();
        const shouldRun = randomValue < 0.05;
        const shouldZoom = randomValue >= 0.05 && randomValue < 0.10;
        const movementTypes = ['sway', 'tilt', 'breathe', 'jump', 'shift'];
        
        let movementType;
        if (shouldRun) {
          movementType = 'run';
        } else if (shouldZoom) {
          movementType = 'zoom';
        } else {
          movementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
        }
        
        // Reset to neutral first
        setRotation(0);
        setTranslateX(0);
        setTranslateY(0);
        setScale(1);
        
        // Apply movement after brief reset
        setTimeout(() => {
          switch (movementType) {
            case 'sway':
              // Subtle horizontal sway (±3px)
              setTranslateX((Math.random() - 0.5) * 6);
              // Return to neutral after movement
              setTimeout(() => {
                setRotation(0);
                setTranslateX(0);
                setTranslateY(0);
                setScale(1);
                scheduleNextMovement();
              }, 2000);
              break;
            case 'tilt':
              // Gentle rotation (±3 degrees)
              setRotation((Math.random() - 0.5) * 6);
              // Return to neutral after movement
              setTimeout(() => {
                setRotation(0);
                setTranslateX(0);
                setTranslateY(0);
                setScale(1);
                scheduleNextMovement();
              }, 2000);
              break;
            case 'breathe':
              // Noticeable scale change (0.96-1.04)
              setScale(0.96 + Math.random() * 0.08);
              // Return to neutral after movement
              setTimeout(() => {
                setRotation(0);
                setTranslateX(0);
                setTranslateY(0);
                setScale(1);
                scheduleNextMovement();
              }, 2000);
              break;
            case 'jump':
              // More visible hop animation
              setTranslateY(-12);
              setTimeout(() => {
                setTranslateY(0);
                // Return to neutral and schedule next
                setTimeout(() => {
                  setRotation(0);
                  setTranslateX(0);
                  setTranslateY(0);
                  setScale(1);
                  scheduleNextMovement();
                }, 1600);
              }, 400);
              break;
            case 'shift':
              // Combination of small movements
              setTranslateX((Math.random() - 0.5) * 4);
              setRotation((Math.random() - 0.5) * 5);
              // Return to neutral after movement
              setTimeout(() => {
                setRotation(0);
                setTranslateX(0);
                setTranslateY(0);
                setScale(1);
                scheduleNextMovement();
              }, 2000);
              break;
            case 'run':
              // Running animation - exit left or right randomly
              const exitLeft = Math.random() < 0.5;
              setIsRunning(true);
              
              if (exitLeft) {
                // Run off screen to the left
                setTranslateX(-600);
                setTimeout(() => {
                  // Instantly move to right side (off screen) - disable transitions
                  setIsRunning(false);
                  setTranslateX(600);
                  setTimeout(() => {
                    // Re-enable transitions and run back to center from right
                    setIsRunning(true);
                    setTranslateX(0);
                    setTimeout(() => {
                      setIsRunning(false);
                      scheduleNextMovement();
                    }, 2000);
                  }, 50);
                }, 2000);
              } else {
                // Run off screen to the right
                setTranslateX(600);
                setTimeout(() => {
                  // Instantly move to left side (off screen) - disable transitions
                  setIsRunning(false);
                  setTranslateX(-600);
                  setTimeout(() => {
                    // Re-enable transitions and run back to center from left
                    setIsRunning(true);
                    setTranslateX(0);
                    setTimeout(() => {
                      setIsRunning(false);
                      scheduleNextMovement();
                    }, 2000);
                  }, 50);
                }, 2000);
              }
              break;
          }
        }, 100);
      }, nextMovementDelay);

      return timeoutId;
    };

    const timeoutId = scheduleNextMovement();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

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
      case 'blink':
        if (hasBlinkFrame) {
          setIsBlinking(true);
          setTimeout(() => setIsBlinking(false), 200);
        }
        break;
    }
  };

  const getCurrentImageUrl = () => {
    // Use blink frame if available and currently blinking
    if (hasBlinkFrame && isBlinking) {
      return bunnyImageUrl.replace('/normal.png', '/blink.png');
    }
    
    // Use normal frame
    return bunnyImageUrl;
  };

  return (
    <img 
      src={getCurrentImageUrl()} 
      alt={alt}
      className={className}
      style={{ 
        transition: isRunning ? 'transform 2s ease-in-out' : 'transform 0.8s ease-in-out', // Slower transition for running
        transform: `rotate(${rotation}deg) translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`
      }}
    />
  );
}