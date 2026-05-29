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

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  settings: {
    rounds: number;
    secondsPerTurn: number;
  };
  state: RoomState;
  currentRound: number;
  totalRounds: number;
  drawerOrder: string[];
  currentDrawerIndex: number;
  currentWord: string;
  roundStartTime: number;
  strokeHistory: Stroke[];
  messages: ChatMessage[];
  roundTimer: NodeJS.Timeout | null;
}

// Socket event payloads
export interface CreateRoomPayload {
  playerName: string;
  settings: { rounds: number; secondsPerTurn: number };
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

export interface WordChoicePayload {
  word: string;
}

export interface StrokePayload {
  stroke: Stroke;
}

export interface ChatPayload {
  text: string;
}

export interface UpdateSettingsPayload {
  settings: { rounds: number; secondsPerTurn: number };
}
