import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { getDocBrownCommentary } from '../services/geminiService';

interface DocRadioProps {
    gameState: GameState;
    finalSpeed: number;
}

const DocRadio: React.FC<DocRadioProps> = ({ gameState, finalSpeed }) => {
    const [message, setMessage] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (gameState === GameState.WON || gameState === GameState.CRASHED || gameState === GameState.BUILDING_CRASH) {
            setLoading(true);
            getDocBrownCommentary(gameState, finalSpeed)
                .then(text => {
                    setMessage(text);
                    setLoading(false);
                });
        } else if (gameState === GameState.START) {
            setMessage("Marty! Hit 88 MPH at the wire! Don't crash!");
        }
    }, [gameState, finalSpeed]);

    return (
        <div className="absolute top-28 left-4 w-64 pointer-events-none z-20">
            <div className="bg-[#000] border-4 border-[#ccaa00] p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)] relative pointer-events-auto flex flex-col gap-2">
                
                <div className="flex items-center gap-3 border-b-2 border-[#333] pb-2">
                    {/* Portrait */}
                    <div className="flex-shrink-0 w-10 h-10 bg-[#333] border-2 border-white overflow-hidden flex items-center justify-center">
                         <div className="text-lg grayscale contrast-150">👨‍🔬</div>
                    </div>
                    <h3 className="text-[#ccaa00] text-[8px] font-['Press_Start_2P'] uppercase tracking-wider">DOC BROWN</h3>
                </div>

                <div className="min-h-[2.5rem]">
                    <p className={`text-[#55ff55] text-[8px] font-['Press_Start_2P'] leading-relaxed ${loading ? 'animate-pulse' : ''}`}>
                        {loading ? "TRANSMITTING..." : `"${message}"`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DocRadio;