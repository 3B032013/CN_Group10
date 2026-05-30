import { Room, Player } from './types';

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(id) ? generateRoomId() : id;
}

export function createRoom(hostId: string, hostName: string, settings: Room['settings']): Room {
  const id = generateRoomId();
  const host: Player = {
    id: hostId,
    name: hostName,
    score: 0,
    hasGuessed: false,
    isConnected: true,
  };
  const room: Room = {
    id,
    hostId,
    players: [host],
    settings,
    state: 'waiting',
    currentRound: 0,
    totalRounds: settings.rounds,
    drawerOrder: [],
    currentDrawerIndex: 0,
    currentWord: '',
    roundStartTime: 0,
    strokeHistory: [],
    messages: [],
    roundTimer: null,
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function deleteRoom(id: string): void {
  const room = rooms.get(id);
  if (room?.roundTimer) clearTimeout(room.roundTimer);
  rooms.delete(id);
}

export function addPlayer(roomId: string, playerId: string, playerName: string): Player | null {
  const room = rooms.get(roomId);
  if (!room || room.state !== 'waiting') return null;
  if (room.players.find(p => p.id === playerId)) return null;

  const player: Player = {
    id: playerId,
    name: playerName,
    score: 0,
    hasGuessed: false,
    isConnected: true,
  };
  room.players.push(player);
  return player;
}

export function removePlayer(roomId: string, playerId: string): { room: Room; wasHost: boolean } | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  const wasHost = room.hostId === playerId;
  room.players = room.players.filter(p => p.id !== playerId);

  if (room.players.length === 0) {
    deleteRoom(roomId);
    return null;
  }

  if (wasHost) {
    room.hostId = room.players[0].id;
  }

  return { room, wasHost };
}

export function getPlayerRoom(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.find(p => p.id === playerId)) return room;
  }
  return undefined;
}

export function listRooms() {
  return [...rooms.values()]
    .filter(r => r.state === 'waiting')
    .map(r => ({
      id: r.id,
      playerCount: r.players.length,
      maxPlayers: 8,
      settings: r.settings,
      hostName: r.players.find(p => p.id === r.hostId)?.name ?? '',
    }));
}
