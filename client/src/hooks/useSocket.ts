import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { Player, ChatMessage, Stroke, RoomInfo } from '../types';

const SOCKET_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001')
  : window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false });
  }
  return socket;
}

interface RoundStartData {
  word: string | null;
  hint: string;
  drawerId: string;
  seconds: number;
}

interface RoundEndData {
  word: string;
  scores: { id: string; name: string; score: number }[];
  drawerId: string;
}

export function useSocketEvents(
  onRoundEnd: (data: RoundEndData) => void,
  onGameEnd: (data: { rankings: Player[] }) => void,
  onDrawStroke: (stroke: Stroke) => void,
  onClearCanvas: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use refs for callbacks so effect doesn't need to re-run
  const onRoundEndRef = useRef(onRoundEnd);
  const onGameEndRef = useRef(onGameEnd);
  const onDrawStrokeRef = useRef(onDrawStroke);
  const onClearCanvasRef = useRef(onClearCanvas);
  onRoundEndRef.current = onRoundEnd;
  onGameEndRef.current = onGameEnd;
  onDrawStrokeRef.current = onDrawStroke;
  onClearCanvasRef.current = onClearCanvas;

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    s.on('connect', () => {
      useGameStore.getState().setMyId(s.id ?? '');
    });

    s.on('room:playerJoin', ({ players }: { player: Player; players: Player[] }) => {
      useGameStore.getState().updatePlayers(players);
    });

    s.on('room:playerLeave', ({ players, newHostId }: { playerId: string; players: Player[]; newHostId: string }) => {
      const room = useGameStore.getState().room;
      if (room) {
        useGameStore.getState().setRoom({ ...room, hostId: newHostId, players });
      }
    });

    s.on('room:settingsUpdated', ({ settings }: { settings: { rounds: number; secondsPerTurn: number } }) => {
      const room = useGameStore.getState().room;
      if (room) useGameStore.getState().setRoom({ ...room, settings });
    });

    s.on('game:start', ({ room }: { room: RoomInfo }) => {
      useGameStore.getState().setRoom(room);
    });

    s.on('game:choosingPhase', ({ drawerId, round, totalRounds }: { drawerId: string; round: number; totalRounds: number }) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const room = useGameStore.getState().room;
      if (room) {
        useGameStore.getState().setRoom({
          ...room,
          state: 'choosing',
          currentRound: round,
          totalRounds,
          currentDrawerId: drawerId,
        });
      }
      useGameStore.getState().clearStrokes();
      useGameStore.getState().setWordChoices([]);
    });

    s.on('game:wordChoices', ({ choices }: { choices: string[] }) => {
      useGameStore.getState().setWordChoices(choices);
    });

    s.on('game:roundStart', (data: RoundStartData) => {
      useGameStore.getState().setRoundStart(data);
      const room = useGameStore.getState().room;
      if (room) useGameStore.getState().setRoom({ ...room, state: 'drawing' });

      if (timerRef.current) clearInterval(timerRef.current);
      let remaining = data.seconds;
      timerRef.current = setInterval(() => {
        remaining--;
        useGameStore.getState().setSecondsLeft(remaining);
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 1000);
    });

    s.on('draw:stroke', ({ stroke }: { stroke: Stroke }) => {
      onDrawStrokeRef.current(stroke);
    });

    s.on('draw:clear', () => {
      onClearCanvasRef.current();
    });

    s.on('chat:message', (msg: ChatMessage) => {
      useGameStore.getState().addMessage(msg);
    });

    s.on('game:correctGuess', ({ playerId }: { playerId: string; playerName: string; points: number; scores: unknown[] }) => {
      const room = useGameStore.getState().room;
      if (room) {
        const updated = room.players.map(p =>
          p.id === playerId ? { ...p, hasGuessed: true } : p
        );
        useGameStore.getState().updatePlayers(updated);
      }
    });

    s.on('game:roundEnd', (data: RoundEndData) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const room = useGameStore.getState().room;
      if (room) useGameStore.getState().setRoom({ ...room, state: 'roundEnd' });
      onRoundEndRef.current(data);
    });

    s.on('game:end', (data: { rankings: Player[] }) => {
      const room = useGameStore.getState().room;
      if (room) useGameStore.getState().setRoom({ ...room, state: 'gameEnd' });
      onGameEndRef.current(data);
    });

    s.on('room:backToLobby', ({ room }: { room: RoomInfo }) => {
      useGameStore.getState().setRoom(room);
      useGameStore.getState().clearStrokes();
      useGameStore.setState({ messages: [] });
    });

    return () => {
      s.off('connect');
      s.off('room:playerJoin');
      s.off('room:playerLeave');
      s.off('room:settingsUpdated');
      s.off('game:start');
      s.off('game:choosingPhase');
      s.off('game:wordChoices');
      s.off('game:roundStart');
      s.off('draw:stroke');
      s.off('draw:clear');
      s.off('chat:message');
      s.off('game:correctGuess');
      s.off('game:roundEnd');
      s.off('game:end');
      s.off('room:backToLobby');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // run once only
}
