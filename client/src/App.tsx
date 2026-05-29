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

interface RoundEndData {
  word: string;
  scores: { id: string; name: string; score: number }[];
  drawerId: string;
}

export default function App() {
  const { room, myId, word, hint, secondsLeft, totalSeconds } = useGameStore();
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

  // No room yet → lobby
  if (!room || room.state === 'waiting') {
    return <WaitingRoom />;
  }

  // Game ended
  if (room.state === 'gameEnd' && rankings) {
    return <GameEnd rankings={rankings} />;
  }

  // Game in progress
  const isDrawer = room.currentDrawerId === myId;
  const timerPercent = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const timerColor = timerPercent > 50 ? '#22c55e' : timerPercent > 25 ? '#f97316' : '#ef4444';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.roundInfo}>
          第 {room.currentRound} / {room.totalRounds} 回合
        </div>

        <div style={styles.wordDisplay}>
          {isDrawer && word ? (
            <span style={styles.word}>{word}</span>
          ) : hint ? (
            <span style={styles.hint}>{hint}</span>
          ) : null}
        </div>

        {room.state === 'drawing' && (
          <div style={styles.timerWrapper}>
            <div style={styles.timerNum}>{secondsLeft}</div>
            <div style={styles.timerBar}>
              <div style={{ ...styles.timerFill, width: `${timerPercent}%`, background: timerColor }} />
            </div>
          </div>
        )}

        {room.state === 'choosing' && (
          <div style={styles.choosingBadge}>選詞中…</div>
        )}
      </div>

      {/* Main area */}
      <div style={styles.main}>
        <div style={styles.canvasCol}>
          <div style={{ position: 'relative' }}>
            <DrawingCanvas ref={canvasRef} isDrawer={isDrawer} />
            {room.state === 'choosing' && <WordChooser />}
            {roundEndData && room.state === 'roundEnd' && (
              <RoundEnd word={roundEndData.word} scores={roundEndData.scores} myId={myId} />
            )}
          </div>
        </div>

        <div style={styles.sidePanel}>
          <Scoreboard />
          <div style={styles.chatWrapper}>
            <ChatBox />
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #ddd',
    padding: '0.6rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  roundInfo: {
    fontWeight: 600,
    color: '#555',
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  wordDisplay: {
    flex: 1,
    textAlign: 'center',
  },
  word: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#667eea',
    letterSpacing: 2,
  },
  hint: {
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: 6,
    color: '#333',
    fontFamily: 'monospace',
  },
  timerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  timerNum: {
    fontWeight: 800,
    fontSize: '1.2rem',
    color: '#333',
    width: 32,
    textAlign: 'center',
  },
  timerBar: {
    width: 80,
    height: 6,
    background: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.9s linear',
  },
  choosingBadge: {
    background: '#fef3c7',
    color: '#92400e',
    padding: '0.2rem 0.6rem',
    borderRadius: 6,
    fontSize: '0.85rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  main: {
    flex: 1,
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    alignItems: 'flex-start',
  },
  canvasCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sidePanel: {
    width: 240,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    height: 'calc(100vh - 80px)',
    flexShrink: 0,
  },
  chatWrapper: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
};
