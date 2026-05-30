import type { Player } from '../types';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';

interface Props {
  rankings: Player[];
  onLeave: () => void;
}

export default function GameEnd({ rankings, onLeave }: Props) {
  const { myId, room } = useGameStore();
  const isHost = room?.hostId === myId;

  function handlePlayAgain() {
    getSocket().emit('room:playAgain');
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>🏆 Game Over!</h2>
      <div style={styles.list}>
        {rankings.map((p, i) => (
          <div
            key={p.id}
            style={{
              ...styles.row,
              ...(i === 0 ? styles.first : {}),
              ...(p.id === myId ? styles.myRow : {}),
            }}
          >
            <span style={styles.rank}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <span style={styles.name}>{p.name}</span>
            <span style={styles.score}>{p.score} pts</span>
          </div>
        ))}
      </div>
      <div style={styles.btnRow}>
        {isHost ? (
          <button style={styles.btn} onClick={handlePlayAgain}>Play Again</button>
        ) : (
          <p style={styles.wait}>Waiting for the host to start a new game…</p>
        )}
        <button style={styles.leaveBtn} onClick={onLeave}>Leave</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#fff',
    marginBottom: '1.5rem',
  },
  list: {
    background: '#fff',
    borderRadius: 12,
    padding: '1rem',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.8rem',
    borderRadius: 8,
    fontSize: '1rem',
  },
  first: {
    background: '#fef3c7',
    fontSize: '1.1rem',
  },
  myRow: {
    outline: '2px solid #667eea',
  },
  rank: { width: 32, textAlign: 'center' },
  name: { flex: 1, fontWeight: 600 },
  score: { fontWeight: 700, color: '#667eea' },
  btnRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  btn: {
    padding: '0.8rem 2.5rem',
    background: '#fff',
    color: '#667eea',
    border: 'none',
    borderRadius: 10,
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  leaveBtn: {
    padding: '0.5rem 1.5rem',
    background: 'transparent',
    color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: 8,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  wait: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.95rem',
    margin: 0,
  },
};
