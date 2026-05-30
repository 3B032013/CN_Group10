import { useRef, useState, useCallback } from 'react';
import { useSocketEvents } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import type { Stroke, Player } from './types';
import WaitingRoom from './components/WaitingRoom';
import DrawingCanvas from './components/DrawingCanvas';
import type { CanvasHandle } from './components/DrawingCanvas';
import ChatBox from './components/ChatBox';
import Scoreboard from './components/Scoreboard';
import WordChooser from './components/WordChooser';
import RoundEnd from './components/RoundEnd';
import GameEnd from './components/GameEnd';
import { getSocket } from './hooks/useSocket';
import DmPanel from './components/DmPanel';

interface RoundEndData {
  word: string;
  scores: { id: string; name: string; score: number }[];
  drawerId: string;
}

export default function App() {
  const { room, myId, word, hint, secondsLeft, totalSeconds, reset } = useGameStore();
  const canvasRef = useRef<CanvasHandle>(null);

  const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
  const [rankings, setRankings] = useState<Player[] | null>(null);

  const onDrawStroke = useCallback((stroke: Stroke) => {
    canvasRef.current?.drawStroke(stroke);
  }, []);

  const onClearCanvas = useCallback(() => {
    canvasRef.current?.clearCanvas();
  }, []);

  const onRoundEnd = useCallback((data: RoundEndData) => {
    setRoundEndData(data);
  }, []);

  const onGameEnd = useCallback((data: { rankings: Player[] }) => {
    setRoundEndData(null);
    setRankings(data.rankings);
  }, []);

  useSocketEvents(onRoundEnd, onGameEnd, onDrawStroke, onClearCanvas);

  function handleLeave() {
    getSocket().emit('room:leave');
    reset();
    setRoundEndData(null);
    setRankings(null);
  }

  if (!room || room.state === 'waiting') {
    return (
      <>
        <WaitingRoom />
        <DmPanel />
      </>
    );
  }

  if (room.state === 'gameEnd' && rankings) {
    return (
      <>
        <GameEnd rankings={rankings} onLeave={handleLeave} />
        <DmPanel />
      </>
    );
  }

  const isDrawer = room.currentDrawerId === myId;
  const timerPercent = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const timerColor = timerPercent > 50 ? '#22c55e' : timerPercent > 25 ? '#f97316' : '#ef4444';

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <button style={styles.leaveBtn} onClick={handleLeave}>← Leave</button>
            <span style={styles.roundInfo}>Round {room.currentRound} / {room.totalRounds}</span>
          </div>

          <div style={styles.wordDisplay}>
            {isDrawer && word
              ? <span style={styles.word}>{word}</span>
              : hint
              ? <span style={styles.hint}>{hint}</span>
              : null}
          </div>

          <div style={styles.headerRight}>
            {room.state === 'drawing' && (
              <div style={styles.timerWrapper}>
                <span style={{ ...styles.timerNum, color: timerColor }}>{secondsLeft}</span>
                <div style={styles.timerBar}>
                  <div style={{ ...styles.timerFill, width: `${timerPercent}%`, background: timerColor }} />
                </div>
              </div>
            )}
            {room.state === 'choosing' && (
              <div style={styles.choosingBadge}>Choosing word…</div>
            )}
          </div>
        </div>
      </div>

      {/* Body: gradient bg + centered content */}
      <div style={styles.body}>
        <div style={styles.gameArea}>
          {/* Canvas column */}
          <div style={styles.canvasCol}>
            <div style={styles.canvasCard}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <DrawingCanvas ref={canvasRef} isDrawer={isDrawer} />
                {room.state === 'choosing' && <WordChooser />}
                {roundEndData && room.state === 'roundEnd' && (
                  <RoundEnd word={roundEndData.word} scores={roundEndData.scores} myId={myId} />
                )}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div style={styles.sidePanel}>
            <div style={styles.scoreCard}>
              <Scoreboard />
            </div>
            <div style={styles.chatCard}>
              <ChatBox />
            </div>
          </div>
        </div>
      </div>

      <DmPanel />
    </div>
  );
}

const HEADER_H = 52;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    height: HEADER_H,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  headerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0 1.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    flexShrink: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  leaveBtn: {
    padding: '0.3rem 0.7rem',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  roundInfo: {
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.9rem',
  },
  wordDisplay: {
    flex: 1,
    textAlign: 'center',
  },
  word: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: 2,
    textShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  hint: {
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: 8,
    color: '#fff',
    fontFamily: 'monospace',
    textShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  timerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  timerNum: {
    fontWeight: 800,
    fontSize: '1.2rem',
    width: 36,
    textAlign: 'center',
    transition: 'color 0.5s',
  },
  timerBar: {
    width: 80,
    height: 5,
    background: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.9s linear, background 0.5s',
  },
  choosingBadge: {
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    padding: '0.25rem 0.8rem',
    borderRadius: 6,
    fontSize: '0.85rem',
    fontWeight: 600,
  },

  // ── Body ────────────────────────────────────────────────
  body: {
    flex: 1,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: '1rem 1.5rem 1.5rem',
    minHeight: 0,
  },
  gameArea: {
    width: '100%',
    maxWidth: 1200,
    display: 'flex',
    gap: '1rem',
    alignItems: 'stretch',
    height: `calc(100vh - ${HEADER_H}px - 2.5rem)`,
  },

  // ── Canvas column ────────────────────────────────────────
  canvasCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  canvasCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: '0.75rem',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.25)',
    minHeight: 0,
  },

  // ── Side panel ───────────────────────────────────────────
  sidePanel: {
    width: 300,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  scoreCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  chatCard: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
};
