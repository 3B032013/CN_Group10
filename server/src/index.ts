import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  getPlayerRoom,
  listRooms,
} from './RoomManager';
import { startGame, chooseWord, handleGuess, sanitizeRoom } from './gameHandler';
import {
  CreateRoomPayload,
  JoinRoomPayload,
  StrokePayload,
  ChatPayload,
  UpdateSettingsPayload,
} from './types';

// Global online users: socketId → name
const onlineUsers = new Map<string, string>();

function broadcastOnline() {
  const list = [...onlineUsers.entries()].map(([id, name]) => ({ id, name }));
  io.emit('users:online', list);
}

const app = express();
app.use(cors());
app.use(express.json());

const DIST = path.join(__dirname, '../../client/dist');
app.use(express.static(DIST));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── 登記名稱（連線後第一件事）────────────────────────────
  socket.on('users:register', (name: string) => {
    onlineUsers.set(socket.id, name || `Player${socket.id.slice(0, 4)}`);
    broadcastOnline();
  });

  // ── 查詢在線列表 ──────────────────────────────────────────
  socket.on('users:list', (cb: Function) => {
    const list = [...onlineUsers.entries()].map(([id, name]) => ({ id, name }));
    cb(list);
  });

  // ── 查詢房間列表 ──────────────────────────────────────────
  socket.on('rooms:list', (cb: Function) => {
    cb(listRooms());
  });

  // ── 建立房間 ──────────────────────────────────────────────
  socket.on('room:create', (payload: CreateRoomPayload, cb: Function) => {
    const room = createRoom(socket.id, payload.playerName, payload.settings);
    socket.join(room.id);
    cb({ ok: true, room: sanitizeRoom(room) });
    console.log(`[room:create] ${room.id} by ${payload.playerName}`);
  });

  // ── 加入房間 ──────────────────────────────────────────────
  socket.on('room:join', (payload: JoinRoomPayload, cb: Function) => {
    const room = getRoom(payload.roomId.toUpperCase());
    if (!room) return cb({ ok: false, error: '找不到房間' });
    if (room.state !== 'waiting') return cb({ ok: false, error: '遊戲已開始' });
    if (room.players.length >= 8) return cb({ ok: false, error: '房間已滿' });

    const player = addPlayer(room.id, socket.id, payload.playerName);
    if (!player) return cb({ ok: false, error: '加入失敗' });

    socket.join(room.id);
    socket.to(room.id).emit('room:playerJoin', { player, players: room.players });
    cb({ ok: true, room: sanitizeRoom(room) });
    console.log(`[room:join] ${payload.playerName} → ${room.id}`);
  });

  // ── 更新設定（僅限房主）──────────────────────────────────
  socket.on('room:updateSettings', (payload: UpdateSettingsPayload) => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.settings = payload.settings;
    io.to(room.id).emit('room:settingsUpdated', { settings: room.settings });
  });

  // ── 開始遊戲（僅限房主）──────────────────────────────────
  socket.on('room:start', () => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2) return;
    if (room.state !== 'waiting') return;
    startGame(io, room);
  });

  // ── 選詞 ─────────────────────────────────────────────────
  socket.on('word:choose', (payload: { word: string }) => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.state !== 'choosing') return;
    const drawerId = room.drawerOrder[room.currentDrawerIndex];
    if (socket.id !== drawerId) return;
    chooseWord(io, room, payload.word);
  });

  // ── 畫筆筆觸 ─────────────────────────────────────────────
  socket.on('draw:stroke', (payload: StrokePayload) => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.state !== 'drawing') return;
    const drawerId = room.drawerOrder[room.currentDrawerIndex];
    if (socket.id !== drawerId) return;
    room.strokeHistory.push(payload.stroke);
    socket.to(room.id).emit('draw:stroke', { stroke: payload.stroke });
  });

  // ── 清除畫布 ─────────────────────────────────────────────
  socket.on('draw:clear', () => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.state !== 'drawing') return;
    const drawerId = room.drawerOrder[room.currentDrawerIndex];
    if (socket.id !== drawerId) return;
    room.strokeHistory = [];
    io.to(room.id).emit('draw:clear');
  });

  // ── 聊天 / 猜答案 ─────────────────────────────────────────
  socket.on('chat:message', (payload: ChatPayload) => {
    const room = getPlayerRoom(socket.id);
    if (!room) return;
    handleGuess(io, socket, room, payload.text);
  });

  // ── 私訊 ──────────────────────────────────────────────────
  socket.on('dm:send', ({ toId, text }: { toId: string; text: string }) => {
    const senderName = onlineUsers.get(socket.id);
    if (!senderName || !text.trim()) return;
    const payload = {
      fromId: socket.id,
      fromName: senderName,
      toId,
      text: text.trim(),
      timestamp: Date.now(),
    };
    io.to(toId).emit('dm:receive', payload);
    socket.emit('dm:receive', payload);
  });

  // ── 再玩一局 ──────────────────────────────────────────────
  socket.on('room:playAgain', () => {
    const room = getPlayerRoom(socket.id);
    if (!room || room.state !== 'gameEnd') return;
    if (room.hostId !== socket.id) return;
    room.state = 'waiting';
    room.players.forEach(p => { p.score = 0; p.hasGuessed = false; });
    room.strokeHistory = [];
    room.messages = [];
    io.to(room.id).emit('room:backToLobby', { room: sanitizeRoom(room) });
  });

  // ── 主動離開房間 ──────────────────────────────────────────
  socket.on('room:leave', () => {
    handleLeave(socket.id);
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
  });

  // ── 斷線 ──────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    broadcastOnline();
    handleLeave(socket.id);
  });

  function handleLeave(playerId: string) {
    const room = getPlayerRoom(playerId);
    if (!room) return;

    const result = removePlayer(room.id, playerId);
    if (!result) return;

    const { room: updatedRoom } = result;
    io.to(updatedRoom.id).emit('room:playerLeave', {
      playerId,
      players: updatedRoom.players,
      newHostId: updatedRoom.hostId,
    });

    console.log(`[leave] ${playerId} left ${updatedRoom.id}`);
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
