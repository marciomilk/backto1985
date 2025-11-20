import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, Obstacle } from '../types';

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const ROAD_WIDTH = 400;
const CAR_WIDTH = 52; // 13 * 4px
const CAR_HEIGHT = 96; // 24 * 4px
// Physics: Reach 88 MPH in ~10 seconds (600 frames)
const ACCELERATION = 0.148; 
const DECELERATION = 0.05;
const MAX_SPEED = 95; 
const STEERING_SPEED = 4;

// Track Config
const TRACK_LENGTH = 10000;
const CABLE_POS = TRACK_LENGTH - 1200;
const BUILDING_POS = TRACK_LENGTH - 200;

// --- Pixel Art Palette ---
const PALETTE = {
    sky: '#1a1a1a', // Dark surround
    road: '#262b44',
    roadLight: '#3a3f5a',
    line: '#ffffff',
    
    // DeLorean Top Down Palette
    carBody: '#8daab9', // Muted blue-grey
    carHighlight: '#a4c2d1',
    carDark: '#1d1d21', // Vents, windshield
    carGlass: '#2e3342',
    carBumper: '#555566',
    lightsOrange: '#ffaa00',
    lightsRed: '#cc2222',
    mrFusion: '#ffffff',
    mrFusionBase: '#aaaaaa',
    
    hook: '#8b9bb4',
    
    // Effects
    fireCore: '#fff1e8',
    fireMid: '#ffec27',
    fireOut: '#ff0044',
    spark: '#00ffff',
    lightningCore: '#e0ffff',
    lightningGlow: '#00ccff',

    // Obstacles
    cat: '#ffa300',
    paper: '#c2c3c7'
};

interface GameCanvasProps {
    gameState: GameState;
    setGameState: (state: GameState) => void;
    onSpeedChange: (speed: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onSpeedChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Game State Refs
    const speedRef = useRef(0);
    const distanceRef = useRef(0);
    const carXRef = useRef(0);
    const obstaclesRef = useRef<Obstacle[]>([]);
    const keysRef = useRef<{ [key: string]: boolean }>({});
    const lastTimeRef = useRef(0);
    const animationFrameRef = useRef<number>(0);
    
    // Animation Sequence Ref (120 -> 0)
    // 120-90: Lightning Strikes & Fluxing
    // 90-60: White Flash Fade In
    // 60-0: White Flash Fade Out & Car Gone
    const animationTimerRef = useRef(0);

    // --- Pixel Drawing Helpers ---
    const drawRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    };

    const drawLightningBolt = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = PALETTE.lightningGlow;
        ctx.strokeStyle = PALETTE.lightningCore;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const segments = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const tarX = x1 + (x2 - x1) * t;
            const tarY = y1 + (y2 - y1) * t;
            
            // Random jagged offset
            const offsetX = (Math.random() - 0.5) * 50;
            const offsetY = (Math.random() - 0.5) * 50;

            ctx.lineTo(tarX + offsetX, tarY + offsetY);
        }
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    };

    // 4x4 Pixel scaler
    const PIXEL = 4;

    const drawTopDownCar = (ctx: CanvasRenderingContext2D, x: number, y: number, isFluxing: boolean) => {
        const p = PIXEL;
        const cx = x - CAR_WIDTH / 2;
        const cy = y;

        // If fluxing, add blue glow
        if (isFluxing) {
            ctx.save();
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 20;
        }

        // 1. Shadow
        drawRect(ctx, cx + 4, cy + 4, CAR_WIDTH, CAR_HEIGHT, 'rgba(0,0,0,0.5)');

        // 2. Front Bumper
        drawRect(ctx, cx, cy, CAR_WIDTH, 1 * p, PALETTE.carBumper);
        
        // 3. Hood (Front Deck)
        drawRect(ctx, cx + 1*p, cy + 1*p, 11*p, 5*p, PALETTE.carBody);
        // Hood details
        drawRect(ctx, cx + 2*p, cy + 2*p, 9*p, 3*p, PALETTE.carHighlight); 

        // 4. Windshield
        drawRect(ctx, cx, cy + 6*p, 13*p, 3*p, PALETTE.carDark);
        drawRect(ctx, cx + 1*p, cy + 6*p, 11*p, 2*p, PALETTE.carGlass);

        // 5. Roof & Gullwing Doors
        drawRect(ctx, cx + 1*p, cy + 9*p, 11*p, 6*p, PALETTE.carBody);
        // Door seams
        drawRect(ctx, cx + 6*p, cy + 9*p, 1*p, 6*p, PALETTE.carDark); 

        // 6. Rear Deck / Engine Cover
        drawRect(ctx, cx, cy + 15*p, 13*p, 7*p, PALETTE.carBody);
        // Black Vents
        drawRect(ctx, cx + 1*p, cy + 15*p, 11*p, 6*p, PALETTE.carDark);
        for(let i=0; i<6; i+=2) {
            drawRect(ctx, cx + 2*p, cy + (15+i)*p, 9*p, 1*p, '#333');
        }

        // 7. Mr Fusion
        drawRect(ctx, cx + 8*p, cy + 18*p, 3*p, 3*p, PALETTE.mrFusion);
        drawRect(ctx, cx + 8.5*p, cy + 18.5*p, 2*p, 2*p, '#ddd');

        // 8. Rear Bumper area
        drawRect(ctx, cx, cy + 22*p, 13*p, 2*p, PALETTE.carBumper);
        // Tail lights
        drawRect(ctx, cx + 1*p, cy + 22.5*p, 3*p, 1*p, PALETTE.lightsOrange);
        drawRect(ctx, cx + 9*p, cy + 22.5*p, 3*p, 1*p, PALETTE.lightsOrange);
        drawRect(ctx, cx + 4*p, cy + 22.5*p, 5*p, 1*p, PALETTE.lightsRed);

        // 9. Side Mirrors
        drawRect(ctx, cx - 1*p, cy + 7*p, 1*p, 2*p, PALETTE.carDark);
        drawRect(ctx, cx + 13*p, cy + 7*p, 1*p, 2*p, PALETTE.carDark);

        // 10. The Hook / Pole
        drawRect(ctx, cx + 11*p, cy + 22*p, 1*p, 8*p, PALETTE.hook); 
        drawRect(ctx, cx + 10*p, cy + 30*p, 3*p, 1*p, PALETTE.hook);

        if (isFluxing) ctx.restore();

        // Flux bands
        if (isFluxing) {
             ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
             // Random bands across car
             for(let k=0; k<3; k++) {
                 const ry = cy + Math.random() * CAR_HEIGHT;
                 ctx.fillRect(cx - 10, ry, CAR_WIDTH + 20, 2);
             }
        }
    };

    // ... (Obstacle drawing)
    const drawPixelObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, screenY: number, centerX: number) => {
        const x = centerX + obs.x;
        const y = screenY;
        const w = obs.width;
        const h = obs.height;

        if (obs.type === 'CAT') {
            drawRect(ctx, x - w/2, y - h/2, w, h, PALETTE.cat);
            drawRect(ctx, x - w/2, y - h/2 + 4, w, 4, '#cc8800');
        } else {
            drawRect(ctx, x - w/2, y - h/2, w, h, PALETTE.paper);
            drawRect(ctx, x - w/2 + 4, y - h/2 + 4, w-8, h-8, '#fff');
        }
    };

    // Initialization
    const initGame = useCallback(() => {
        speedRef.current = 0;
        distanceRef.current = 0;
        carXRef.current = 0;
        animationTimerRef.current = 0;
        
        const newObstacles: Obstacle[] = [];
        for (let dist = 800; dist < CABLE_POS - 800; dist += Math.random() * 500 + 300) {
            const typeRoll = Math.random();
            const type = typeRoll > 0.5 ? 'CAT' : 'NEWSPAPER';
            const laneWidth = ROAD_WIDTH / 2 - 60;
            const lane = (Math.random() * 2 - 1) * laneWidth;
            
            newObstacles.push({
                id: Math.random(),
                x: lane,
                y: dist,
                type: type,
                width: 32,
                height: 32
            });
        }
        obstaclesRef.current = newObstacles;
    }, []);

    useEffect(() => {
        if (gameState === GameState.START) {
            initGame();
        }
    }, [gameState, initGame]);

    // Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysRef.current[e.code] = true;
            if (gameState !== GameState.PLAYING && gameState !== GameState.START) {
                 if (e.code === 'Enter') setGameState(GameState.START);
            } else if (gameState === GameState.START && e.code === 'Space') {
                setGameState(GameState.PLAYING);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, setGameState]);


    // Loop
    const loop = useCallback((timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        lastTimeRef.current = timestamp;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) return;

        // --- LOGIC ---
        if (gameState === GameState.PLAYING) {
            // Physics
            if (keysRef.current['Space']) {
                if (speedRef.current < MAX_SPEED) speedRef.current += ACCELERATION;
            } else {
                if (speedRef.current > 0) speedRef.current -= DECELERATION;
            }
            if (speedRef.current < 0) speedRef.current = 0;

            // Steering
            if (speedRef.current > 1) { 
                if (keysRef.current['ArrowLeft']) carXRef.current -= STEERING_SPEED;
                if (keysRef.current['ArrowRight']) carXRef.current += STEERING_SPEED;
            }

            // Boundaries
            const maxOffset = ROAD_WIDTH / 2 - CAR_WIDTH / 2;
            if (carXRef.current < -maxOffset) carXRef.current = -maxOffset;
            if (carXRef.current > maxOffset) carXRef.current = maxOffset;

            // Movement
            distanceRef.current += speedRef.current * 0.15;

            // Car Hitbox
            const carDrawY = CANVAS_HEIGHT - 150;
            const playerRect = {
                l: carXRef.current - CAR_WIDTH / 2 + 8,
                r: carXRef.current + CAR_WIDTH / 2 - 8,
                t: carDrawY, 
                b: carDrawY + CAR_HEIGHT
            };

            // Obstacles
            for (const obs of obstaclesRef.current) {
                const screenY = (CANVAS_HEIGHT - 150) - (obs.y - distanceRef.current);
                
                if (screenY > -50 && screenY < CANVAS_HEIGHT) {
                    const obsRect = {
                        l: obs.x - obs.width / 2,
                        r: obs.x + obs.width / 2,
                        t: screenY - obs.height / 2,
                        b: screenY + obs.height / 2
                    };
                    if (playerRect.l < obsRect.r && playerRect.r > obsRect.l &&
                        playerRect.t < obsRect.b && playerRect.b > obsRect.t) {
                        setGameState(GameState.CRASHED);
                    }
                }
            }

            // Cable Logic
            const cableScreenY = (CANVAS_HEIGHT - 150) - (CABLE_POS - distanceRef.current);
            const hookY = carDrawY + CAR_HEIGHT + 20; 
            
            if (Math.abs(cableScreenY - hookY) < 20) {
                if (speedRef.current >= 88) {
                    setGameState(GameState.WON);
                    animationTimerRef.current = 120; // Start 2 second animation sequence
                }
            }

            // Building
            if (distanceRef.current >= BUILDING_POS) {
                setGameState(GameState.BUILDING_CRASH);
            }
        }
        
        onSpeedChange(speedRef.current);

        // --- RENDER ---
        ctx.imageSmoothingEnabled = false; 

        // 1. Background
        ctx.fillStyle = PALETTE.sky;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Shake
        ctx.save();
        if (speedRef.current > 85 || animationTimerRef.current > 80) {
            const shake = 3 + (speedRef.current - 85) * 0.5;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        // 2. Road
        const centerX = CANVAS_WIDTH / 2;
        drawRect(ctx, centerX - ROAD_WIDTH / 2, 0, ROAD_WIDTH, CANVAS_HEIGHT, PALETTE.road);
        
        const moveOffset = Math.floor(distanceRef.current) % 80;
        
        // Curbs
        for (let y = -80; y < CANVAS_HEIGHT; y += 80) {
            const drawY = y + moveOffset;
            const isLight = Math.floor((distanceRef.current + y) / 80) % 2 === 0;
            
            drawRect(ctx, centerX - ROAD_WIDTH / 2 - 20, drawY, 20, 80, '#333');
            drawRect(ctx, centerX - ROAD_WIDTH / 2 - 20, drawY, 20, 40, '#555');
            
            drawRect(ctx, centerX + ROAD_WIDTH / 2, drawY, 20, 80, '#333');
            drawRect(ctx, centerX + ROAD_WIDTH / 2, drawY, 20, 40, '#555');
            drawRect(ctx, centerX - 4, drawY + 20, 8, 40, PALETTE.line);
        }

        // 3. Obstacles
        obstaclesRef.current.forEach(obs => {
             const screenY = (CANVAS_HEIGHT - 150) - (obs.y - distanceRef.current);
             if (screenY > -100 && screenY < CANVAS_HEIGHT + 100) {
                 drawPixelObstacle(ctx, obs, screenY, centerX);
             }
        });

        // 4. Cable
        const cableScreenY = (CANVAS_HEIGHT - 150) - (CABLE_POS - distanceRef.current);
        if (cableScreenY > -100 && cableScreenY < CANVAS_HEIGHT) {
            drawRect(ctx, centerX - ROAD_WIDTH/2 - 40, cableScreenY - 100, 40, 120, '#3e2723');
            drawRect(ctx, centerX + ROAD_WIDTH/2, cableScreenY - 100, 40, 120, '#3e2723');
            
            ctx.beginPath();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 4;
            ctx.moveTo(centerX - ROAD_WIDTH/2, cableScreenY);
            ctx.lineTo(centerX + ROAD_WIDTH/2, cableScreenY);
            ctx.stroke();
            
            for(let x = centerX - ROAD_WIDTH/2; x < centerX + ROAD_WIDTH/2; x += 60) {
                drawRect(ctx, x + 10, cableScreenY, 10, 10, '#ff0000');
            }
        }

        // 5. Building
        const buildingScreenY = (CANVAS_HEIGHT - 150) - (BUILDING_POS - distanceRef.current);
        if (buildingScreenY < CANVAS_HEIGHT) {
             drawRect(ctx, centerX - 300, buildingScreenY, 600, 400, '#222');
             drawRect(ctx, centerX - 100, buildingScreenY + 300, 200, 100, '#5577ff');
        }

        // 6. DeLorean & Effects
        const carDrawX = centerX + carXRef.current;
        const carDrawY = CANVAS_HEIGHT - 150;
        
        // Animation Logic
        const anim = animationTimerRef.current;
        const isTimeTraveling = gameState === GameState.WON;
        const showCar = !isTimeTraveling || anim > 60; // Hide car in last phase
        const isFluxing = speedRef.current >= 88 || (isTimeTraveling && anim > 80);

        // Fire Trails
        if (isFluxing) {
            // Longer trails if WON
            const extraLen = isTimeTraveling ? 200 : 0;
            const fireLength = Math.random() * 100 + 50 + extraLen;
            
            drawRect(ctx, carDrawX - CAR_WIDTH/2 + 4, carDrawY + CAR_HEIGHT - 20, 10, fireLength, PALETTE.fireOut);
            drawRect(ctx, carDrawX - CAR_WIDTH/2 + 6, carDrawY + CAR_HEIGHT - 20, 6, fireLength * 0.8, PALETTE.fireMid);
            
            drawRect(ctx, carDrawX + CAR_WIDTH/2 - 14, carDrawY + CAR_HEIGHT - 20, 10, fireLength, PALETTE.fireOut);
            drawRect(ctx, carDrawX + CAR_WIDTH/2 - 12, carDrawY + CAR_HEIGHT - 20, 6, fireLength * 0.8, PALETTE.fireMid);
        }

        if (showCar) {
            drawTopDownCar(ctx, carDrawX, carDrawY, isFluxing);
        }

        // Sparks
        if (speedRef.current > 80 && gameState === GameState.PLAYING) {
             for(let i=0; i<3; i++) {
                 const sx = carDrawX + (Math.random() - 0.5) * 60;
                 const sy = carDrawY + (Math.random()) * CAR_HEIGHT;
                 drawRect(ctx, sx, sy, 4, 4, PALETTE.spark);
             }
        }

        // 7. Lightning Animation (WIN STATE)
        if (isTimeTraveling && anim > 80) {
            // Source: Simulated Clock Tower/Pole Top Left
            const sourceX = centerX - 200;
            const sourceY = -50;
            const cableHitX = centerX + 20;

            // Bolt 1: Source to Cable
            drawLightningBolt(ctx, sourceX, sourceY, cableHitX, cableScreenY);
            // Bolt 2: Thicker secondary
            if (Math.random() > 0.3) drawLightningBolt(ctx, sourceX + 20, sourceY, cableHitX, cableScreenY);

            // Bolt 3: Cable to Car Hook
            const hookTipX = carDrawX + 42; // Right side rear
            const hookTipY = carDrawY + 120; 
            drawLightningBolt(ctx, cableHitX, cableScreenY, hookTipX, hookTipY);

            // Plasma Arcs around Car
            for(let i=0; i<8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = 50 + Math.random() * 40;
                const sx = carDrawX + Math.cos(angle) * r;
                const sy = carDrawY + CAR_HEIGHT/2 + Math.sin(angle) * r;
                drawLightningBolt(ctx, sx, sy, carDrawX + (Math.random()-0.5)*10, carDrawY + CAR_HEIGHT/2);
            }
        }

        // 8. Flash Overlay Sequence
        // 90 -> 60: Fade To White
        // 60 -> 0: Fade From White
        if (anim > 0) {
            let alpha = 0;
            if (anim > 90) {
                alpha = 0; // Just lightning
            } else if (anim > 60) {
                // Ramp up 0 to 1
                alpha = (90 - anim) / 30; 
            } else {
                // Ramp down 1 to 0
                alpha = anim / 60;
            }
            
            if (alpha > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            
            animationTimerRef.current--;
        }

        ctx.restore();
        animationFrameRef.current = requestAnimationFrame(loop);
    }, [gameState, onSpeedChange, setGameState]);

    useEffect(() => {
        animationFrameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [loop]);

    return (
        <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT}
            className="w-full h-full object-contain bg-[#111] border-4 border-[#555] rounded-sm shadow-[0_0_0_10px_#000]"
            style={{ imageRendering: 'pixelated' }}
        />
    );
};

export default GameCanvas;