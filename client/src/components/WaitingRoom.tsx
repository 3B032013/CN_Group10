import { useState, useEffect } from 'react';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import type { RoomInfo } from '../types';

interface RoomSummary {
  id: string;
  playerCount: number;
  maxPlayers: number;
  settings: { rounds: number; secondsPerTurn: number };
  hostName: string;
}

function randomName() {
  return `Player${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function WaitingRoom() {
  const { room, myId, setMyName, setRoom, reset } = useGameStore();
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(80);
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');

  const isHost = room?.hostId === myId;

  function getEffectiveName() {
    return nameInput.trim() || randomName();
  }

  useEffect(() => {
    if (room) return;
    const s = getSocket();
    if (!s.connected) s.connect();

    function fetchList() {
      s.emit('rooms:list', (list: RoomSummary[]) => setRoomList(list));
    }

    fetchList();
    const t = setInterval(fetchList, 3000);
    return () => clearInterval(t);
  }, [room]);

  function handleCreate() {
    const name = getEffectiveName();
    setLoading(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    setMyName(name);
    s.emit('users:register', name);
    s.emit(
      'room:create',
      { playerName: name, settings: { rounds, secondsPerTurn: seconds } },
      (res: { ok: boolean; room?: RoomInfo; error?: string }) => {
        setLoading(false);
        if (res.ok && res.room) setRoom(res.room);
        else setError(res.error ?? 'Failed to create room');
      }
    );
  }

  function handleJoinRoom(roomId: string) {
    const name = getEffectiveName();
    setJoining(roomId);
    const s = getSocket();
    setMyName(name);
    s.emit('users:register', name);
    s.emit(
      'room:join',
      { roomId, playerName: name },
      (res: { ok: boolean; room?: RoomInfo; error?: string }) => {
        setJoining(null);
        if (res.ok && res.room) setRoom(res.room);
        else setError(res.error ?? 'Failed to join room');
      }
    );
  }

  function handleStart() {
    getSocket().emit('room:start');
  }

  function handleUpdateSettings() {
    getSocket().emit('room:updateSettings', { settings: { rounds, secondsPerTurn: seconds } });
  }

  function handleLeave() {
    getSocket().emit('room:leave');
    reset();
  }

  // ── In-room waiting lobby ────────────────────────────────
  if (room) {
    return (
      <div style={styles.lobby}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.title}>Waiting Room</h2>
            <button style={styles.leaveBtn} onClick={handleLeave}>Leave Room</button>
          </div>

          <div style={styles.shareRow}>
            <span style={styles.shareLabel}>Share code:</span>
            <span style={styles.code}>{room.id}</span>
            <button
              style={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(room.id)}
              title="Copy room code"
            >
              Copy
            </button>
          </div>

          <div style={styles.playerList}>
            <div style={styles.sectionLabel}>Players ({room.players.length}/8)</div>
            {room.players.map(p => (
              <div key={p.id} style={styles.playerRow}>
                <span>{p.name}</span>
                {p.id === room.hostId && <span style={styles.hostBadge}>Host</span>}
                {p.id === myId && <span style={styles.meBadge}>You</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div style={styles.settings}>
              <div style={styles.sectionLabel}>Game Settings</div>
              <label style={styles.settingRow}>
                Rounds:
                <select value={rounds} onChange={e => setRounds(Number(e.target.value))} style={styles.select}
                  onBlur={handleUpdateSettings}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label style={styles.settingRow}>
                Seconds per turn:
                <select value={seconds} onChange={e => setSeconds(Number(e.target.value))} style={styles.select}
                  onBlur={handleUpdateSettings}>
                  {[30, 60, 80, 90, 120].map(n => <option key={n} value={n}>{n}s</option>)}
                </select>
              </label>
            </div>
          )}

          {!isHost && <p style={styles.waitText}>Waiting for the host to start…</p>}

          {isHost && (
            <button
              style={{ ...styles.btn, opacity: room.players.length < 2 ? 0.5 : 1 }}
              disabled={room.players.length < 2}
              onClick={handleStart}
            >
              Start Game ({room.players.length} players)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main lobby ───────────────────────────────────────────
  return (
    <div style={styles.lobby}>
      <div style={styles.lobbyLayout}>

        {/* Left: room list */}
        <div style={styles.listPanel}>
          <h2 style={styles.panelTitle}>Open Rooms</h2>

          <input
            style={styles.input}
            placeholder="Your name (optional — leave blank for a random name)"
            value={nameInput}
            maxLength={12}
            onChange={e => { setNameInput(e.target.value); setError(''); }}
          />

          {/* Join by room code */}
          <div style={styles.joinByCode}>
            <input
              style={{ ...styles.input, marginBottom: 0, flex: 1 }}
              placeholder="Have a code? Enter it here"
              value={codeInput}
              maxLength={6}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && codeInput.trim() && handleJoinRoom(codeInput.trim())}
            />
            <button
              style={{ ...styles.joinBtn, padding: '0.5rem 0.9rem', flexShrink: 0 }}
              disabled={!codeInput.trim() || joining === codeInput}
              onClick={() => handleJoinRoom(codeInput.trim())}
            >
              Join
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {roomList.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎨</div>
              <p>No  yet.</p>
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Create one to get started!</p>
            </div>
          ) : (
            <div style={styles.roomCards}>
              {roomList.map(r => (
                <div key={r.id} style={styles.roomCard}>
                  <div style={styles.roomCardLeft}>
                    <div style={styles.roomCardHost}>{r.hostName}'s Room</div>
                    <div style={styles.roomCardMeta}>
                      {r.settings.rounds} rounds · {r.settings.secondsPerTurn}s per turn
                    </div>
                  </div>
                  <div style={styles.roomCardRight}>
                    <span style={styles.playerCount}>
                      {r.playerCount}/{r.maxPlayers}
                    </span>
                    <button
                      style={{ ...styles.joinBtn, opacity: r.playerCount >= r.maxPlayers ? 0.5 : 1 }}
                      disabled={r.playerCount >= r.maxPlayers || joining === r.id}
                      onClick={() => handleJoinRoom(r.id)}
                    >
                      {joining === r.id ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: create room */}
        <div style={styles.createPanel}>
          <h2 style={styles.panelTitle}>Create Room</h2>

          {!showCreate ? (
            <button style={styles.btn} onClick={() => setShowCreate(true)}>
              Create Room
            </button>
          ) : (
            <>
              <div style={styles.settingBlock}>
                <label style={styles.settingRow}>
                  Rounds:
                  <select value={rounds} onChange={e => setRounds(Number(e.target.value))} style={styles.select}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label style={styles.settingRow}>
                  Seconds:
                  <select value={seconds} onChange={e => setSeconds(Number(e.target.value))} style={styles.select}>
                    {[30, 60, 80, 90, 120].map(n => <option key={n} value={n}>{n}s</option>)}
                  </select>
                </label>
              </div>
              <button style={styles.btn} onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating…' : 'Confirm'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  lobby: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  lobbyLayout: {
    display: 'flex',
    gap: '1.5rem',
    width: '100%',
    maxWidth: 900,
    alignItems: 'flex-start',
  },
  listPanel: {
    flex: 1,
    background: '#fff',
    borderRadius: 16,
    padding: '1.5rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    minHeight: 400,
  },
  createPanel: {
    width: 260,
    background: '#fff',
    borderRadius: 16,
    padding: '1.5rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  panelTitle: {
    margin: '0 0 1rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '0.7rem',
    marginBottom: '0.8rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
  },
  joinByCode: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  error: { color: '#e53e3e', fontSize: '0.85rem', marginBottom: '0.5rem' },
  emptyState: { textAlign: 'center', padding: '3rem 1rem', color: '#999' },
  emptyIcon: { fontSize: '3rem', marginBottom: '0.5rem' },
  roomCards: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.8rem 1rem',
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#fafafa',
  },
  roomCardLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  roomCardHost: { fontWeight: 600, fontSize: '0.95rem', color: '#333' },
  roomCardMeta: { fontSize: '0.8rem', color: '#999' },
  roomCardRight: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  playerCount: { fontSize: '0.85rem', color: '#667eea', fontWeight: 600 },
  joinBtn: {
    padding: '0.4rem 0.9rem',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  settingBlock: { marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  btn: {
    width: '100%',
    padding: '0.8rem',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '0.5rem',
  },
  cancelBtn: {
    width: '100%',
    padding: '0.6rem',
    background: 'transparent',
    color: '#999',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    width: 400,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  title: { margin: 0, color: '#333', fontSize: '1.3rem' },
  leaveBtn: {
    padding: '0.35rem 0.8rem',
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  shareRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    background: '#f5f5f5',
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
  },
  shareLabel: {
    fontSize: '0.8rem',
    color: '#888',
    flexShrink: 0,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#667eea',
    letterSpacing: 2,
    flex: 1,
  },
  copyBtn: {
    padding: '0.2rem 0.6rem',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  sectionLabel: { fontWeight: 600, color: '#555', marginBottom: '0.5rem', fontSize: '0.85rem' },
  playerList: { marginBottom: '1rem' },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '0.9rem',
  },
  hostBadge: {
    background: '#ffd700',
    color: '#333',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  meBadge: {
    background: '#667eea',
    color: '#fff',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
    fontSize: '0.75rem',
  },
  settings: { marginBottom: '1rem', padding: '0.8rem', background: '#f9f9f9', borderRadius: 8 },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  select: { padding: '0.25rem', borderRadius: 4, border: '1px solid #ddd' },
  waitText: { textAlign: 'center', color: '#999', marginBottom: '0.5rem', fontSize: '0.9rem' },
};
