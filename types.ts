export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  WON = 'WON',
  CRASHED = 'CRASHED',
  BUILDING_CRASH = 'BUILDING_CRASH'
}

export interface Position {
  x: number;
  y: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number; // Relative distance from start
  type: 'CAT' | 'NEWSPAPER' | 'TRASH_CAN';
  width: number;
  height: number;
}

export interface GameConfig {
  trackLength: number;
  cablePosition: number;
  buildingPosition: number;
  laneWidth: number;
  roadWidth: number;
}
