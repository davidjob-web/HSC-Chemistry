import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Info, HelpCircle } from 'lucide-react';

const CobaltEquilibrium = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  
  // Simulation state
  const [isRunning, setIsRunning] = useState(true);
  const [chlorideConcentration, setChlorideConcentration] = useState(50);
  const [temperature, setTemperature] = useState(50);
  const [speed, setSpeed] = useState(50);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showParticleCounts, setShowParticleCounts] = useState(false);
  const [showEquation, setShowEquation] = useState(false);
  const [showMechanism, setShowMechanism] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    pinkComplexes: 0,
    blueComplexes: 0,
    chlorideIons: 0,
    waterMolecules: 0,
    overallColor: '#ff69b4'
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PARTICLE_RADIUS = 4;
  const COMPLEX_RADIUS = 8;

  // Particle types
  const PARTICLE_TYPES = {
    PINK_COMPLEX: 'pink_complex',
    BLUE_COMPLEX: 'blue_complex',
    CHLORIDE: 'chloride',
    WATER: 'water'
  };

  // Initialize particles
  const initializeParticles = () => {
    const particles = [];
    
    // Start with mostly pink complexes
    const numComplexes = 40;
    for (let i = 0; i < numComplexes; i++) {
      particles.push({
        id: `complex_${i}`,
        type: Math.random() < 0.7 ? PARTICLE_TYPES.PINK_COMPLEX : PARTICLE_TYPES.BLUE_COMPLEX,
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: COMPLEX_RADIUS,
        reactionCooldown: 0
      });
    }
    
    // Add chloride ions based on slider
    const updateChlorideCount = (concentration) => {
      const targetChloride = Math.floor((concentration / 100) * 120);
      const currentChloride = particles.filter(p => p.type === PARTICLE_TYPES.CHLORIDE).length;
      
      if (targetChloride > currentChloride) {
        for (let i = currentChloride; i < targetChloride; i++) {
          particles.push({
            id: `cl_${i}`,
            type: PARTICLE_TYPES.CHLORIDE,
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            radius: PARTICLE_RADIUS
          });
        }
      } else if (targetChloride < currentChloride) {
        const chlorideParticles = particles.filter(p => p.type === PARTICLE_TYPES.CHLORIDE);
        const toRemove = currentChloride - targetChloride;
        for (let i = 0; i < toRemove; i++) {
          const idx = particles.indexOf(chlorideParticles[i]);
          if (idx > -1) particles.splice(idx, 1);
        }
      }
    };
    
    updateChlorideCount(chlorideConcentration);
    
    // Add water molecules
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: `water_${i}`,
        type: PARTICLE_TYPES.WATER,
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        radius: PARTICLE_RADIUS
      });
    }
    
    particlesRef.current = particles;
  };

  // Calculate color based on complex ratio
  const calculateOverallColor = (pinkCount, blueCount) => {
    const total = pinkCount + blueCount;
    if (total === 0) return '#ff69b4';
    
    const blueRatio = blueCount / total;
    const pinkRatio = pinkCount / total;
    
    // Pink: #ff69b4 (255, 105, 180)
    // Blue: #4169e1 (65, 105, 225)
    const r = Math.round(255 * pinkRatio + 65 * blueRatio);
    const g = 105;
    const b = Math.round(180 * pinkRatio + 225 * blueRatio);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Check for reactions
  const checkReactions = (particles, tempFactor, speedFactor) => {
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      
      // Skip if on cooldown
      if (p1.reactionCooldown > 0) {
        p1.reactionCooldown--;
        continue;
      }
      
      // Forward reaction: Pink + Cl- -> Blue + H2O
      if (p1.type === PARTICLE_TYPES.PINK_COMPLEX) {
        for (let j = 0; j < particles.length; j++) {
          const p2 = particles[j];
          if (p2.type === PARTICLE_TYPES.CHLORIDE) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < (p1.radius + p2.radius + 5)) {
              // Reaction probability based on temperature and collision
              const reactionProb = 0.02 * tempFactor * speedFactor;
              if (Math.random() < reactionProb) {
                // Convert pink to blue
                p1.type = PARTICLE_TYPES.BLUE_COMPLEX;
                p1.reactionCooldown = 30;
                
                // Remove one chloride, add water molecules
                particles.splice(j, 1);
                
                // Add water molecules near the complex
                for (let w = 0; w < 2; w++) {
                  particles.push({
                    id: `water_${Date.now()}_${w}`,
                    type: PARTICLE_TYPES.WATER,
                    x: p1.x + (Math.random() - 0.5) * 30,
                    y: p1.y + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    radius: PARTICLE_RADIUS
                  });
                }
                break;
              }
            }
          }
        }
      }
      
      // Reverse reaction: Blue + H2O -> Pink + Cl-
      if (p1.type === PARTICLE_TYPES.BLUE_COMPLEX) {
        for (let j = 0; j < particles.length; j++) {
          const p2 = particles[j];
          if (p2.type === PARTICLE_TYPES.WATER) {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < (p1.radius + p2.radius + 5)) {
              // Reverse reaction probability (lower than forward)
              const reactionProb = 0.008 * tempFactor * speedFactor;
              if (Math.random() < reactionProb) {
                // Convert blue to pink
                p1.type = PARTICLE_TYPES.PINK_COMPLEX;
                p1.reactionCooldown = 30;
                
                // Add chloride ions
                particles.push({
                  id: `cl_${Date.now()}`,
                  type: PARTICLE_TYPES.CHLORIDE,
                  x: p1.x + (Math.random() - 0.5) * 30,
                  y: p1.y + (Math.random() - 0.5) * 30,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  radius: PARTICLE_RADIUS
                });
                break;
              }
            }
          }
        }
      }
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Speed and temperature factors
    const speedFactor = speed / 50;
    const tempFactor = temperature / 50;
    
    // Update positions
    particles.forEach(p => {
      p.x += p.vx * speedFactor;
      p.y += p.vy * speedFactor;
      
      // Bounce off walls
      if (p.x < p.radius || p.x > CANVAS_WIDTH - p.radius) {
        p.vx *= -1;
        p.x = Math.max(p.radius, Math.min(CANVAS_WIDTH - p.radius, p.x));
      }
      if (p.y < p.radius || p.y > CANVAS_HEIGHT - p.radius) {
        p.vy *= -1;
        p.y = Math.max(p.radius, Math.min(CANVAS_HEIGHT - p.radius, p.y));
      }
    });
    
    // Check for reactions
    if (isRunning) {
      checkReactions(particles, tempFactor, speedFactor);
    }
    
    // Count particles
    let pinkCount = 0;
    let blueCount = 0;
    let chlorideCount = 0;
    let waterCount = 0;
    
    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      
      switch(p.type) {
        case PARTICLE_TYPES.PINK_COMPLEX:
          ctx.fillStyle = '#ff69b4';
          pinkCount++;
          break;
        case PARTICLE_TYPES.BLUE_COMPLEX:
          ctx.fillStyle = '#4169e1';
          blueCount++;
          break;
        case PARTICLE_TYPES.CHLORIDE:
          ctx.fillStyle = '#90ee90';
          chlorideCount++;
          break;
        case PARTICLE_TYPES.WATER:
          ctx.fillStyle = '#87ceeb';
          waterCount++;
          break;
      }
      
      ctx.fill();
      
      // Add glow for complexes
      if (p.type === PARTICLE_TYPES.PINK_COMPLEX || p.type === PARTICLE_TYPES.BLUE_COMPLEX) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    
    // Update stats
    setStats({
      pinkComplexes: pinkCount,
      blueComplexes: blueCount,
      chlorideIons: chlorideCount,
      waterMolecules: waterCount,
      overallColor: calculateOverallColor(pinkCount, blueCount)
    });
    
    animationRef.current = requestAnimationFrame(animate);
  };

  // Initialize on mount
  useEffect(() => {
    initializeParticles();
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update chloride concentration
  useEffect(() => {
    const particles = particlesRef.current;
    const targetChloride = Math.floor((chlorideConcentration / 100) * 120);
    const currentChloride = particles.filter(p => p.type === PARTICLE_TYPES.CHLORIDE).length;
    
    if (targetChloride > currentChloride) {
      for (let i = currentChloride; i < targetChloride; i++) {
        particles.push({
          id: `cl_${Date.now()}_${i}`,
          type: PARTICLE_TYPES.CHLORIDE,
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          radius: PARTICLE_RADIUS
        });
      }
    } else if (targetChloride < currentChloride) {
      const chlorideParticles = particles.filter(p => p.type === PARTICLE_TYPES.CHLORIDE);
      const toRemove = currentChloride - targetChloride;
      for (let i = 0; i < toRemove; i++) {
        const idx = particles.indexOf(chlorideParticles[i]);
        if (idx > -1) particles.splice(idx, 1);
      }
    }
  }, [chlorideConcentration]);

  const handleReset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    initializeParticles();
    animate();
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cobalt Chloride Equilibrium</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              title="Information"
            >
              <Info size={20} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Simulation Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border-2 border-gray-700 rounded-lg"
            />
            
            {/* Solution color indicator */}
            <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 p-3 rounded-lg">
              <div className="text-sm mb-2">Solution Color</div>
              <div 
                className="w-20 h-20 rounded border-2 border-white"
                style={{ backgroundColor: stats.overallColor }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 w-full max-w-4xl">
            <div className="bg-gray-800 p-4 rounded-lg space-y-4">
              {/* Playback controls */}
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 transition"
                >
                  {isRunning ? <Pause size={20} /> : <Play size={20} />}
                  {isRunning ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2 transition"
                >
                  <RotateCcw size={20} />
                  Reset
                </button>
              </div>

              {/* Chloride concentration slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-semibold">Chloride Concentration</label>
                  <span className="text-sm text-gray-400">{chlorideConcentration}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={chlorideConcentration}
                  onChange={(e) => setChlorideConcentration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            
            {/* Temperature */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold">Temperature</label>
                <span className="text-sm text-gray-400">{temperature}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Higher temperature increases reaction rates
              </p>
            </div>

            {/* Speed */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-semibold">Animation Speed</label>
                <span className="text-sm text-gray-400">{speed}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Display options */}
            <div className="border-t border-gray-700 pt-4">
              <h3 className="font-semibold mb-3">Display Options</h3>
              
              <label className="flex items-center mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showParticleCounts}
                  onChange={(e) => setShowParticleCounts(e.target.checked)}
                  className="mr-2"
                />
                <span>Show Particle Counts</span>
              </label>

              <label className="flex items-center mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEquation}
                  onChange={(e) => setShowEquation(e.target.checked)}
                  className="mr-2"
                />
                <span>Show Chemical Equation</span>
              </label>

              <label className="flex items-center mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMechanism}
                  onChange={(e) => setShowMechanism(e.target.checked)}
                  className="mr-2"
                />
                <span>Show Reaction Mechanism</span>
              </label>
            </div>

            {/* Particle counts */}
            {showParticleCounts && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="font-semibold mb-3">Particle Counts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-pink-400 mr-2"></span>
                      Pink Complex
                    </span>
                    <span className="font-mono">{stats.pinkComplexes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                      Blue Complex
                    </span>
                    <span className="font-mono">{stats.blueComplexes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                      Chloride Ions
                    </span>
                    <span className="font-mono">{stats.chlorideIons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full bg-sky-300 mr-2"></span>
                      Water Molecules
                    </span>
                    <span className="font-mono">{stats.waterMolecules}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chemical equation */}
            {showEquation && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="font-semibold mb-3">Equilibrium Equation</h3>
                <div className="bg-gray-900 p-3 rounded text-sm font-mono">
                  <div className="text-pink-400">Co(H₂O)₆²⁺</div>
                  <div className="text-center my-1">+</div>
                  <div className="text-green-400">4Cl⁻</div>
                  <div className="text-center my-2">⇌</div>
                  <div className="text-blue-400">CoCl₄²⁻</div>
                  <div className="text-center my-1">+</div>
                  <div className="text-sky-300">6H₂O</div>
                </div>
              </div>
            )}

            {/* Mechanism */}
            {showMechanism && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="font-semibold mb-3">Reaction Mechanism</h3>
                <div className="text-sm space-y-2 text-gray-300">
                  <p>
                    <strong>Forward:</strong> Chloride ions collide with pink hexaaqua complexes, 
                    displacing water molecules to form blue tetrachloro complexes.
                  </p>
                  <p>
                    <strong>Reverse:</strong> Water molecules collide with blue tetrachloro complexes, 
                    displacing chloride ions to reform pink hexaaqua complexes.
                  </p>
                  <p className="text-yellow-400">
                    Both reactions occur simultaneously. Changing chloride concentration 
                    shifts the equilibrium by affecting collision frequency.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Panel */}
        {showInfo && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">About This Simulation</h2>
            
            <div className="space-y-4 text-sm text-gray-300">
              <section>
                <h3 className="font-semibold text-white mb-2">What You're Seeing</h3>
                <p>
                  This simulation shows the dynamic equilibrium between two cobalt complexes:
                </p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li><span className="text-pink-400 font-semibold">Pink particles</span>: Co(H₂O)₆²⁺ (hexaaquacobalt)</li>
                  <li><span className="text-blue-400 font-semibold">Blue particles</span>: CoCl₄²⁻ (tetrachlorocobalt)</li>
                  <li><span className="text-green-400 font-semibold">Green particles</span>: Cl⁻ ions</li>
                  <li><span className="text-sky-300 font-semibold">Light blue particles</span>: H₂O molecules</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-white mb-2">Key Concepts</h3>
                <p>
                  <strong>Dynamic Equilibrium:</strong> Both forward and reverse reactions 
                  happen continuously. Watch carefully and you'll see pink complexes turning 
                  blue while blue complexes simultaneously turn pink.
                </p>
                <p className="mt-2">
                  <strong>Le Chatelier's Principle:</strong> When you increase chloride 
                  concentration, more collisions occur between Cl⁻ and pink complexes, 
                  shifting equilibrium toward the blue form.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-white mb-2">Try This</h3>
                <ol className="list-decimal ml-5 space-y-2">
                  <li>Watch the simulation at default settings. Notice both reactions occurring.</li>
                  <li>Increase chloride concentration. Watch the solution shift toward blue.</li>
                  <li>Decrease chloride concentration. The equilibrium shifts back toward pink.</li>
                  <li>Adjust temperature to see how it affects reaction rates.</li>
                </ol>
              </section>

              <section>
                <h3 className="font-semibold text-white mb-2">Real-World Connection</h3>
                <p>
                  This is the same reaction you see in the laboratory demo where adding 
                  concentrated HCl to a pink cobalt solution turns it blue, and diluting 
                  with water turns it back to pink.
                </p>
              </section>

              <section className="bg-blue-900 bg-opacity-30 p-3 rounded">
                <h3 className="font-semibold text-white mb-2 flex items-center">
                  <HelpCircle size={16} className="mr-2" />
                  Teaching Tip
                </h3>
                <p>
                  Challenge students: "If equilibrium means the reactions have stopped, 
                  why does the solution color change?" Then show them this simulation 
                  to reveal that both reactions continue, but the rates shift.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CobaltEquilibrium;