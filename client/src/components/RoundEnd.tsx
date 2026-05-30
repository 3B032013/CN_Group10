interface Props {
  word: string;
  scores: { id: string; name: string; score: number }[];
  myId: string;
}

export default function RoundEnd({ word, scores, myId }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.wordReveal}>The word was: <span style={styles.word}>{word}</span></div>
        <div style={styles.list}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ ...styles.row, ...(p.id === myId ? styles.myRow : {}) }}>
              <span style={styles.rank}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span style={styles.name}>{p.name}</span>
              <span style={styles.score}>{p.score}</span>
            </div>
          ))}
        </div>
        <p style={styles.next}>Next round in 5 seconds…</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    zIndex: 10,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '1.5rem 2rem',
    minWidth: 280,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  wordReveal: {
    fontSize: '1rem',
    color: '#555',
    marginBottom: '1rem',
  },
  word: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#667eea',
    marginLeft: '0.4rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.3rem 0.5rem',
    borderRadius: 6,
  },
  myRow: { background: '#ede9fe' },
  rank: { width: 28 },
  name: { flex: 1, textAlign: 'left' },
  score: { fontWeight: 700, color: '#667eea' },
  next: { color: '#aaa', fontSize: '0.85rem' },
};
