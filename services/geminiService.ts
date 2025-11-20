import { GoogleGenAI } from "@google/genai";
import { GameState } from '../types';

const getAI = () => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not set in environment variables.");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getDocBrownCommentary = async (gameState: GameState, finalSpeed: number): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Great Scott! The API Key is missing!";

    let prompt = "";

    if (gameState === GameState.WON) {
        prompt = `You are Doc Brown from Back to the Future. The user just successfully hit the lightning cable at ${finalSpeed.toFixed(1)} MPH and time traveled! Give a short, ecstatic congratulatory remark (max 2 sentences). Mention 1.21 gigawatts.`;
    } else if (gameState === GameState.CRASHED) {
        prompt = `You are Doc Brown. The user crashed the DeLorean into an obstacle at ${finalSpeed.toFixed(1)} MPH. Give a short, frantic warning or scolding about being careful with the time machine (max 2 sentences).`;
    } else if (gameState === GameState.BUILDING_CRASH) {
        prompt = `You are Doc Brown. The user failed to reach 88 MPH (only hit ${finalSpeed.toFixed(1)} MPH) and crashed into the theater/building at the end of the street. Express despair that we are stuck in this timeline (max 2 sentences).`;
    } else {
        return "Great Scott!";
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Great Scott!";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "This is heavy! The radio is broken!";
    }
};
