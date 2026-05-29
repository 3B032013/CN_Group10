import { useGameStore } from '../store/gameStore';

export default function Scoreboard() {
  const { room, myId } = useGameStore();
  if (!room) return null;

  const sorted = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>排行榜</div>
      {sorted.map((p, i) => (
        <div
          key={p.id}
          style={{
            ...styles.row,
            ...(p.id === myId ? styles.myRow : {}),
            ...(p.id === room.currentDrawerId ? styles.drawerRow : {}),
          }}
        >
          <span style={styles.rank}>
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
          </span>
          <span style={styles.name}>{p.name}</span>
          {p.hasGuessed && <span style={styles.correct}>✓</span>}
          {p.id === room.currentDrawerId && <span style={styles.drawing}>🎨</span>}
          <span style={styles.score}>{p.score}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: '0.5rem',
  },
  title: {
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#555',
    marginBottom: '0.4rem',
    textAlign: 'center',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.35rem 0.4rem',
    borderRadius: 6,
    fontSize: '0.875rem',
  },
  myRow: {
    background: '#ede9fe',
  },
  drawerRow: {
    outline: '1px solid #667eea',
  },
  rank: { width: 24, textAlign: 'center' },
  name: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  score: { fontWeight: 700, color: '#667eea', minWidth: 36, textAlign: 'right' },
  correct: { color: '#16a34a', fontSize: '0.8rem' },
  drawing: { fontSize: '0.8rem' },
};
