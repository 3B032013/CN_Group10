import { create } from 'zustand';
import type { Player, RoomInfo, ChatMessage, Stroke, RoomState } from '../types';

interface GameState {
  // Connection / identity
  myId: string;
  myName: string;

  // Room
  room: RoomInfo | null;
  messages: ChatMessage[];

  // Current round
  word: string | null;       // Only set for drawer
  hint: string | null;       // Underscores
  drawerId: string | null;
  secondsLeft: number;
  totalSeconds: number;
  strokeHistory: Stroke[];   // For replaying to late joiners (unused in simple impl)

  // Word choices (drawer only)
  wordChoices: string[];

  // Actions
  setMyId: (id: string) => void;
  setMyName: (name: string) => void;
  setRoom: (room: RoomInfo) => void;
  updatePlayers: (players: Player[]) => void;
  addMessage: (msg: ChatMessage) => void;
  setRoundStart: (data: { word: string | null; hint: string; drawerId: string; seconds: number }) => void;
  setSecondsLeft: (s: number) => void;
  setWordChoices: (choices: string[]) => void;
  addStroke: (stroke: Stroke) => void;
  clearStrokes: () => void;
  setRoomState: (state: RoomState) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  myId: '',
  myName: '',
  room: null,
  messages: [],
  word: null,
  hint: null,
  drawerId: null,
  secondsLeft: 0,
  totalSeconds: 0,
  strokeHistory: [],
  wordChoices: [],

  setMyId: (id) => set({ myId: id }),
  setMyName: (name) => set({ myName: name }),
  setRoom: (room) => set({ room }),
  updatePlayers: (players) =>
    set((s) => s.room ? { room: { ...s.room, players } } : {}),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setRoundStart: ({ word, hint, drawerId, seconds }) =>
    set({ word, hint, drawerId, secondsLeft: seconds, totalSeconds: seconds }),
  setSecondsLeft: (s) => set({ secondsLeft: s }),
  setWordChoices: (choices) => set({ wordChoices: choices }),
  addStroke: (stroke) =>
    set((s) => ({ strokeHistory: [...s.strokeHistory, stroke] })),
  clearStrokes: () => set({ strokeHistory: [] }),
  setRoomState: (state) =>
    set((s) => s.room ? { room: { ...s.room, state } } : {}),
  reset: () =>
    set({
      room: null,
      messages: [],
      word: null,
      hint: null,
      drawerId: null,
      secondsLeft: 0,
      strokeHistory: [],
      wordChoices: [],
    }),
}));
