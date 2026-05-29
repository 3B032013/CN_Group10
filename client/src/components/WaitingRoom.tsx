import { useState } from 'react';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import type { RoomInfo } from '../types';

export default function WaitingRoom() {
  const { room, myId, setMyName, setRoom } = useGameStore();
  const [nameInput, setNameInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(80);
  const [tab, setTab] = useState<'create' | 'join'>('create');

  const isHost = room?.hostId === myId;

  function handleCreate() {
    if (!nameInput.trim()) return setError('請輸入名稱');
    setLoading(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    s.once('connect', () => setMyName(nameInput.trim()));
    setMyName(nameInput.trim());
    s.emit(
      'room:create',
      { playerName: nameInput.trim(), settings: { rounds, secondsPerTurn: seconds } },
      (res: { ok: boolean; room?: RoomInfo; error?: string }) => {
        setLoading(false);
        if (res.ok && res.room) {
          setRoom(res.room);
        } else {
          setError(res.error ?? '建立失敗');
        }
      }
    );
  }

  function handleJoin() {
    if (!nameInput.trim()) return setError('請輸入名稱');
    if (!roomIdInput.trim()) return setError('請輸入房間代碼');
    setLoading(true);
    const s = getSocket();
    if (!s.connected) s.connect();
    setMyName(nameInput.trim());
    s.emit(
      'room:join',
      { roomId: roomIdInput.trim().toUpperCase(), playerName: nameInput.trim() },
      (res: { ok: boolean; room?: RoomInfo; error?: string }) => {
        setLoading(false);
        if (res.ok && res.room) {
          setRoom(res.room);
        } else {
          setError(res.error ?? '加入失敗');
        }
      }
    );
  }

  function handleStart() {
    getSocket().emit('room:start');
  }

  function handleUpdateSettings() {
    getSocket().emit('room:updateSettings', { settings: { rounds, secondsPerTurn: seconds } });
  }

  // In-lobby view
  if (room) {
    return (
      <div style={styles.lobby}>
        <div style={styles.card}>
          <h2 style={styles.title}>等待室</h2>
          <div style={styles.roomCode}>
            房間代碼：<span style={styles.code}>{room.id}</span>
          </div>

          <div style={styles.playerList}>
            <div style={styles.sectionLabel}>玩家列表 ({room.players.length}/8)</div>
            {room.players.map(p => (
              <div key={p.id} style={styles.playerRow}>
                <span>{p.name}</span>
                {p.id === room.hostId && <span style={styles.hostBadge}>房主</span>}
                {p.id === myId && <span style={styles.meBadge}>我</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div style={styles.settings}>
              <div style={styles.sectionLabel}>遊戲設定</div>
              <label style={styles.settingRow}>
                回合數：
                <select value={rounds} onChange={e => setRounds(Number(e.target.value))} style={styles.select}
                  onBlur={handleUpdateSettings}>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label style={styles.settingRow}>
                每回合秒數：
                <select value={seconds} onChange={e => setSeconds(Number(e.target.value))} style={styles.select}
                  onBlur={handleUpdateSettings}>
                  {[30, 60, 80, 90, 120].map(n => <option key={n} value={n}>{n} 秒</option>)}
                </select>
              </label>
            </div>
          )}

          {!isHost && (
            <p style={styles.waitText}>等待房主開始遊戲…</p>
          )}

          {isHost && (
            <button
              style={{ ...styles.btn, opacity: room.players.length < 2 ? 0.5 : 1 }}
              disabled={room.players.length < 2}
              onClick={handleStart}
            >
              開始遊戲 ({room.players.length} 人)
            </button>
          )}
        </div>
      </div>
    );
  }

  // Entry screen
  return (
    <div style={styles.lobby}>
      <div style={styles.card}>
        <h1 style={styles.mainTitle}>🎨 你畫我猜</h1>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'create' ? styles.activeTab : {}) }}
            onClick={() => setTab('create')}
          >
            建立房間
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'join' ? styles.activeTab : {}) }}
            onClick={() => setTab('join')}
          >
            加入房間
          </button>
        </div>

        <input
          style={styles.input}
          placeholder="輸入你的名稱"
          value={nameInput}
          maxLength={12}
          onChange={e => { setNameInput(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
        />

        {tab === 'join' && (
          <input
            style={styles.input}
            placeholder="輸入房間代碼"
            value={roomIdInput}
            maxLength={6}
            onChange={e => { setRoomIdInput(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        )}

        {tab === 'create' && (
          <div style={styles.settingsRow}>
            <label>回合數：
              <select value={rounds} onChange={e => setRounds(Number(e.target.value))} style={styles.select}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>秒數：
              <select value={seconds} onChange={e => setSeconds(Number(e.target.value))} style={styles.select}>
                {[30, 60, 80, 90, 120].map(n => <option key={n} value={n}>{n}s</option>)}
              </select>
            </label>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.btn}
          onClick={tab === 'create' ? handleCreate : handleJoin}
          disabled={loading}
        >
          {loading ? '連線中…' : tab === 'create' ? '建立房間' : '加入房間'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  lobby: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '2rem',
    width: 380,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  mainTitle: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '1.5rem',
    color: '#333',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '1rem',
  },
  tabs: {
    display: 'flex',
    marginBottom: '1rem',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #ddd',
  },
  tab: {
    flex: 1,
    padding: '0.6rem',
    border: 'none',
    background: '#f5f5f5',
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  activeTab: {
    background: '#667eea',
    color: '#fff',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '0.7rem',
    marginBottom: '0.8rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  settingsRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.8rem',
    fontSize: '0.9rem',
  },
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
  },
  error: {
    color: '#e53e3e',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
  },
  roomCode: {
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.95rem',
    color: '#555',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#667eea',
    letterSpacing: 3,
  },
  sectionLabel: {
    fontWeight: 600,
    color: '#555',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  playerList: {
    marginBottom: '1rem',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0',
    borderBottom: '1px solid #f0f0f0',
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
  settings: {
    marginBottom: '1rem',
    padding: '0.8rem',
    background: '#f9f9f9',
    borderRadius: 8,
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  select: {
    padding: '0.25rem',
    borderRadius: 4,
    border: '1px solid #ddd',
  },
  waitText: {
    textAlign: 'center',
    color: '#999',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
};
