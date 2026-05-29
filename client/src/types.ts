export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  isConnected: boolean;
}

export interface Stroke {
  tool: 'pen' | 'eraser';
  color: string;
  size: number;
  points: [number, number][];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  type: 'chat' | 'system' | 'correct';
  timestamp: number;
}

export type RoomState =
  | 'waiting'
  | 'choosing'
  | 'drawing'
  | 'roundEnd'
  | 'gameEnd';

export interface RoomInfo {
  id: string;
  hostId: string;
  players: Player[];
  settings: { rounds: number; secondsPerTurn: number };
  state: RoomState;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
}
