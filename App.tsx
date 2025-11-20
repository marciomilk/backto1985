import React, { useState, useEffect, useRef } from 'react'; 
// NOTE: We have removed 'useSound' and are using native HTML audio elements.
// The file path includes your repository name to prevent the 404 error on GitHub Pages.
const themeSongUrl = '/backto1985/game-theme.mp3'; 

// Assuming these paths are correct for your local setup
import GameCanvas from './components/GameCanvas';
import { Speedometer } from './components/Speedometer';
import DocRadio from './components/DocRadio';
// IMPORTANT: Make sure your GameState import path is correct if it's not in './types'
import { GameState } from './types'; 

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  // 1. Create a reference to the hidden HTML <audio> element
  const audioRef = useRef<HTMLAudioElement>(null); 

  // Helper function to stop the music (used on crash/win)
  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio) {
        audio.pause();
        audio.currentTime = 0; // Rewind the song
    }
  };

  // 2. Combined state change handler for Start, Crash, and Win buttons
  const handleGameStateChange = (newState: GameState) => {
    // If we are leaving the playing state (e.g., crashing or winning), stop music
    if (newState !== GameState.PLAYING) {
        stopAudio();
    }
    setGameState(newState);
  };
  
  // 3. CRITICAL: Handles the 'Start' button click to initiate music and game
  const handleStartClick = () => {
    const audio = audioRef.current;
    
    // --- START AUDIO LOGIC FIRST (Reversed Order) ---
    if (audio) {
        // 🚨 DEBUG: Log the status to the console
        console.log("Audio Status (Attempting Play):", {
            src: audio.src,
            readyState: audio.readyState, 
            paused: audio.paused
        });

        audio.loop = true;
        audio.volume = 0.5;
        
        audio.play().catch(e => {
            console.error("Audio Playback Blocked (Promise Rejection):", e);
        }); 
    } else {
        // Log if the element itself is missing
        console.error("Audio Playback Failed: audioRef is null.");
    }
    // --- END AUDIO LOGIC ---

    // 4. Set state LAST (This is the crucial change for timing)
    setGameState(GameState.PLAYING);
  };


  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-[ 'Press_Start_2P']">
      
      {/* 4. NATIVE AUDIO ELEMENT (Hidden) - The player for the music */}
      <audio ref={audioRef} src={themeSongUrl} preload="auto" />

      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
          backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}></div>

      {/* Main Game Container */}
      <div className="relative w-full max-w-4xl aspect-[4/3] z-0 shadow-2xl border-4 border-[#333]">
        
        {/* Title Overlay (Inside Container now for scaling) */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none">
            <h1 className="text-2xl md:text-4xl text-[#ffcc00] drop-shadow-[4px_4px_0_#aa0000] font-['Press_Start_2P'] leading-tight">
            88 MPH
            </h1>
            <p className="text-[10px] text-[#55ffff] mt-2 font-['Press_Start_2P'] tracking-widest">PROJECT: TIME TRAIN</p>
        </div>

        <GameCanvas 
            gameState={gameState} 
            setGameState={handleGameStateChange} // Use the custom handler
            onSpeedChange={setCurrentSpeed}
        />

        {/* HUD Components - Moved inside for relative positioning */}
        <Speedometer speed={currentSpeed} />
        <DocRadio gameState={gameState} finalSpeed={currentSpeed} />
        
        {/* Start Screen Overlay - We use this screen to capture the user click */}
        {gameState === GameState.START && (
            <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/70 z-30">
                <div className="text-center p-6 border-4 border-white bg-[#222] shadow-[8px_8px_0_#000] max-w-md mx-4">
                    <h2 className="text-xl text-[#ffcc00] mb-4 font-['Press_Start_2P'] leading-loose">READY TO GO BACK?</h2>
                    <div className="space-y-3 text-white mb-6 text-[10px] font-['Press_Start_2P'] text-left px-4 bg-[#111] p-4 border-2 border-[#444]">
                        <p className="text-yellow-200 underline mb-2">MISSION OBJECTIVES:</p>
                        <p>1. HOLD <span className="text-[#ff0044]">SPACE</span> TO ACCELERATE</p>
                        <p>2. DODGE OBSTACLES (<span className="text-[#ff0044]">ARROWS</span>)</p>
                        <p>3. REACH <span className="text-[#ffff00]">88 MPH</span> BEFORE THE WIRE</p>
                    </div>
                    {/* The onClick now uses the handleStartClick function */}
                    <button 
                        className="px-6 py-3 bg-[#0044cc] text-white text-xs border-4 border-white hover:bg-[#0066ff] active:translate-y-1 font-['Press_Start_2P'] w-full"
                        onClick={handleStartClick}
                    >
                        INSERT COIN / START
                    </button>
                </div>
            </div>
        )}

        {/* Game Over Overlay - Aligned to Top */}
        {(gameState === GameState.CRASHED || gameState === GameState.BUILDING_CRASH) && (
             <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/60 z-30">
                <div className="text-center p-6 border-4 border-red-600 bg-[#220000] shadow-[8px_8px_0_#000] max-w-md mx-4">
                    <h2 className="text-2xl text-red-500 mb-2 font-['Press_Start_2P']">CRASHED!</h2>
                    <div className="text-white mb-6 font-['Press_Start_2P'] text-xs bg-[#440000] p-4 border-2 border-red-800 mt-4">
                        <p className="mb-2">IMPACT SPEED:</p>
                        <p className="text-xl text-yellow-400">{currentSpeed.toFixed(1)} MPH</p>
                    </div>
                    {/* Updated the onClick handler */}
                    <button 
                        className="px-6 py-3 bg-red-600 text-white text-xs border-4 border-white hover:bg-red-500 font-['Press_Start_2P'] w-full"
                        onClick={() => handleGameStateChange(GameState.START)}
                    >
                        TRY AGAIN
                    </button>
                </div>
             </div>
        )}

        {/* Win Overlay - Transparent background for animation visibility */}
        {gameState === GameState.WON && (
             <div className="absolute inset-0 flex items-start justify-center pt-24 z-30 pointer-events-none">
                <div className="text-center p-6 border-4 border-black bg-[#ffcc00] shadow-[10px_10px_0_#000] max-w-md mx-4 pointer-events-auto opacity-0 animate-[fadeIn_1s_ease-in_2s_forwards]">
                    <h2 className="text-xl text-black mb-4 font-['Press_Start_2P']">
                        TIME TRAVEL SUCCESSFUL!
                    </h2>
                    <div className="bg-black text-[#ffcc00] p-4 border-2 border-white mb-6">
                        <p className="font-['Press_Start_2P'] text-[10px] mb-2">DESTINATION TIME:</p>
                        <p className="font-['Press_Start_2P'] text-sm">NOV 12 1955 06:00 AM</p>
                    </div>
                    <button 
                        className="px-6 py-3 bg-black text-white text-xs border-4 border-white hover:bg-gray-800 font-['Press_Start_2P'] w-full"
                        onClick={() => handleGameStateChange(GameState.START)}
                    >
                        REBOOT SYSTEM
                    </button>
                </div>
             </div>
        )}
      </div>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
