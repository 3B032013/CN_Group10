import { Server, Socket } from 'socket.io';
import { Room, ChatMessage } from './types';
import { getRandomWords } from './wordBank';
import { calcGuesserScore, DRAWER_POINTS_PER_GUESS } from './ScoreCalculator';
import { getRoom, deleteRoom } from './RoomManager';
import { randomUUID } from 'crypto';

function currentDrawerId(room: Room): string {
  return room.drawerOrder[room.currentDrawerIndex];
}

function buildHint(word: string): string {
  return word
    .split('')
    .map(() => '_')
    .join(' ');
}

function systemMsg(text: string): ChatMessage {
  return {
    id: randomUUID(),
    playerId: 'system',
    playerName: '系統',
    text,
    type: 'system',
    timestamp: Date.now(),
  };
}

export function startGame(io: Server, room: Room): void {
  room.state = 'choosing';
  room.currentRound = 1;
  room.drawerOrder = [...room.players].map(p => p.id);
  room.currentDrawerIndex = 0;
  room.players.forEach(p => { p.score = 0; p.hasGuessed = false; });

  io.to(room.id).emit('game:start', { room: sanitizeRoom(room) });
  startChoosingPhase(io, room);
}

function startChoosingPhase(io: Server, room: Room): void {
  room.state = 'choosing';
  room.strokeHistory = [];
  room.players.forEach(p => { p.hasGuessed = false; });
  io.to(room.id).emit('draw:clear');

  const drawerId = currentDrawerId(room);
  const choices = getRandomWords(3);

  io.to(room.id).emit('game:choosingPhase', {
    drawerId,
    round: room.currentRound,
    totalRounds: room.totalRounds,
  });

  // Send word choices only to drawer
  io.to(drawerId).emit('game:wordChoices', { choices });

  // Auto-pick after 15s if drawer doesn't choose
  room.roundTimer = setTimeout(() => {
    if (room.state === 'choosing') {
      chooseWord(io, room, choices[0]);
    }
  }, 15000);
}

export function chooseWord(io: Server, room: Room, word: string): void {
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  room.state = 'drawing';
  room.currentWord = word;
  room.roundStartTime = Date.now();
  room.strokeHistory = [];

  const hint = buildHint(word);
  const drawerId = currentDrawerId(room);

  // Drawer gets the actual word
  io.to(drawerId).emit('game:roundStart', {
    word,
    hint,
    drawerId,
    seconds: room.settings.secondsPerTurn,
  });

  // Others get the hint
  room.players.forEach(p => {
    if (p.id !== drawerId) {
      io.to(p.id).emit('game:roundStart', {
        word: null,
        hint,
        drawerId,
        seconds: room.settings.secondsPerTurn,
      });
    }
  });

  const msg = systemMsg(`🎨 ${room.players.find(p => p.id === drawerId)?.name} is drawing!`);
  room.messages.push(msg);
  io.to(room.id).emit('chat:message', msg);

  room.roundTimer = setTimeout(() => {
    if (room.state === 'drawing') endRound(io, room);
  }, room.settings.secondsPerTurn * 1000);
}

export function handleGuess(io: Server, socket: Socket, room: Room, text: string): void {
  const player = room.players.find(p => p.id === socket.id);
  if (!player) return;

  const drawerId = currentDrawerId(room);
  const isDrawer = socket.id === drawerId;

  // Drawer or already-guessed players just chat
  if (isDrawer || player.hasGuessed) {
    const msg: ChatMessage = {
      id: randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text: player.hasGuessed
        ? filterAnswer(text, room.currentWord)
        : text,
      type: 'chat',
      timestamp: Date.now(),
    };
    room.messages.push(msg);
    io.to(room.id).emit('chat:message', msg);
    return;
  }

  if (room.state !== 'drawing') return;

  if (text.trim().toLowerCase() === room.currentWord.toLowerCase()) {
    // Correct guess
    player.hasGuessed = true;
    const elapsed = (Date.now() - room.roundStartTime) / 1000;
    const remaining = Math.max(0, room.settings.secondsPerTurn - elapsed);
    const guesserPoints = calcGuesserScore(remaining, room.settings.secondsPerTurn);
    player.score += guesserPoints;

    // Drawer gets flat +10 pts per correct guesser (Gartic.io style)
    const drawer = room.players.find(p => p.id === drawerId);
    if (drawer) drawer.score += DRAWER_POINTS_PER_GUESS;

    const guessMsg: ChatMessage = {
      id: randomUUID(),
      playerId: 'system',
      playerName: 'System',
      text: `🎉 ${player.name} guessed it! +${guesserPoints} pts`,
      type: 'correct',
      timestamp: Date.now(),
    };
    const drawerMsg: ChatMessage = {
      id: randomUUID(),
      playerId: 'system',
      playerName: 'System',
      text: `🎨 ${drawer?.name ?? 'Drawer'} +${DRAWER_POINTS_PER_GUESS} pts`,
      type: 'correct',
      timestamp: Date.now() + 1,
    };
    room.messages.push(guessMsg, drawerMsg);
    io.to(room.id).emit('chat:message', guessMsg);
    io.to(room.id).emit('chat:message', drawerMsg);
    io.to(room.id).emit('game:correctGuess', {
      playerId: player.id,
      playerName: player.name,
      points: guesserPoints,
      scores: getScores(room),
    });

    // Check if all non-drawers guessed
    const nonDrawers = room.players.filter(p => p.id !== drawerId);
    if (nonDrawers.every(p => p.hasGuessed)) {
      endRound(io, room);
    }
  } else {
    // Wrong guess - broadcast as chat
    const msg: ChatMessage = {
      id: randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text,
      type: 'chat',
      timestamp: Date.now(),
    };
    room.messages.push(msg);
    io.to(room.id).emit('chat:message', msg);
  }
}

function endRound(io: Server, room: Room): void {
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
  room.state = 'roundEnd';

  const drawerId = currentDrawerId(room);
  io.to(room.id).emit('game:roundEnd', {
    word: room.currentWord,
    scores: getScores(room),
    drawerId,
  });

  // Advance to next turn after 5s
  room.roundTimer = setTimeout(() => advanceTurn(io, room), 5000);
}

function advanceTurn(io: Server, room: Room): void {
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  room.currentDrawerIndex++;

  if (room.currentDrawerIndex >= room.drawerOrder.length) {
    // All players drew this round
    if (room.currentRound >= room.totalRounds) {
      endGame(io, room);
      return;
    }
    room.currentRound++;
    room.currentDrawerIndex = 0;
  }

  startChoosingPhase(io, room);
}

function endGame(io: Server, room: Room): void {
  room.state = 'gameEnd';
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  io.to(room.id).emit('game:end', { rankings: sorted });
}

function getScores(room: Room) {
  return room.players.map(p => ({ id: p.id, name: p.name, score: p.score }));
}

function filterAnswer(text: string, answer: string): string {
  const regex = new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return text.replace(regex, '***');
}

export function sanitizeRoom(room: Room) {
  return {
    id: room.id,
    hostId: room.hostId,
    players: room.players,
    settings: room.settings,
    state: room.state,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentDrawerId: room.drawerOrder[room.currentDrawerIndex] ?? null,
  };
}
