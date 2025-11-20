import React from 'react';

interface SpeedometerProps {
    speed: number;
}

export const Speedometer: React.FC<SpeedometerProps> = ({ speed }) => {
    const speedString = Math.min(speed, 188).toFixed(1).padStart(4, '0');
    const [intPart, decPart] = speedString.split('.');
    const isEightyEight = speed >= 88;

    return (
        <div className="absolute top-6 right-6 flex flex-col items-end pointer-events-none z-20">
            <div className="bg-[#222] border-4 border-[#555] p-3 shadow-[4px_4px_0_#000]">
                <div className="text-[8px] text-[#ff9900] mb-1 font-['Press_Start_2P'] text-right">SPEED</div>
                <div className={`font-['Press_Start_2P'] text-2xl flex items-baseline ${isEightyEight ? 'text-[#ff0000] animate-pulse' : 'text-[#ffcc00]'}`}>
                    <span>{intPart}</span>
                    <span className="text-sm mx-1">.</span>
                    <span>{decPart}</span>
                    <span className="text-[8px] ml-2 text-[#555]">MPH</span>
                </div>
            </div>
            
            {isEightyEight && (
                <div className="mt-2 text-[#ff0000] text-[8px] bg-black p-2 border-2 border-[#ff0000] font-['Press_Start_2P'] animate-bounce">
                    FLUXING!
                </div>
            )}
        </div>
    );
};