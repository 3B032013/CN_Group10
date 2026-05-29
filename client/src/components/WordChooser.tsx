import { useState, useEffect } from 'react';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';

export default function WordChooser() {
  const { wordChoices, room, myId } = useGameStore();
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    setCountdown(15);
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [wordChoices]);

  const isDrawer = room?.currentDrawerId === myId;
  const drawerName = room?.players.find(p => p.id === room.currentDrawerId)?.name ?? '';

  function choose(word: string) {
    getSocket().emit('word:choose', { word });
  }

  if (isDrawer) {
    return (
      <div style={styles.overlay}>
        <div style={styles.card}>
          <p style={styles.sub}>選一個詞來畫（{countdown}s）</p>
          <div style={styles.choices}>
            {wordChoices.map(w => (
              <button key={w} style={styles.wordBtn} onClick={() => choose(w)}>
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <p style={styles.waiting}>🎨 {drawerName} 正在選詞…</p>
        <div style={styles.spinner} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    zIndex: 10,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2rem',
    textAlign: 'center',
    minWidth: 280,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  sub: {
    fontSize: '1.1rem',
    color: '#555',
    marginBottom: '1.2rem',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  wordBtn: {
    padding: '0.8rem 2rem',
    fontSize: '1.3rem',
    fontWeight: 700,
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
  waiting: {
    fontSize: '1.1rem',
    color: '#555',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '4px solid #eee',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '1rem auto 0',
  },
};
