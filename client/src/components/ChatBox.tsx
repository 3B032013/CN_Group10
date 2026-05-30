import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';

export default function ChatBox() {
  const { messages, myId, room } = useGameStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const me = room?.players.find(p => p.id === myId);
  const isDrawer = room?.currentDrawerId === myId;
  const hasGuessed = me?.hasGuessed ?? false;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    getSocket().emit('chat:message', { text });
    setInput('');
  }

  const placeholder = isDrawer
    ? 'Drawers cannot guess…'
    : hasGuessed
    ? 'Correct! You can still chat 😄'
    : 'Type your guess or chat…';

  return (
    <div style={styles.wrapper}>
      <div style={styles.messages}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              ...styles.msgRow,
              ...(msg.type === 'system' ? styles.systemMsg : {}),
              ...(msg.type === 'correct' ? styles.correctMsg : {}),
            }}
          >
            {msg.type === 'chat' && (
              <>
                <span style={{ ...styles.name, ...(msg.playerId === myId ? styles.myName : {}) }}>
                  {msg.playerName}:
                </span>
                <span style={styles.text}>{msg.text}</span>
              </>
            )}
            {(msg.type === 'system' || msg.type === 'correct') && (
              <span style={styles.text}>{msg.text}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          placeholder={placeholder}
          maxLength={50}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isDrawer}
        />
        <button style={styles.sendBtn} onClick={handleSend} disabled={isDrawer}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  msgRow: {
    display: 'flex',
    gap: '0.3rem',
    fontSize: '0.875rem',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  systemMsg: {
    color: '#888',
    fontStyle: 'italic',
    justifyContent: 'center',
  },
  correctMsg: {
    color: '#16a34a',
    fontWeight: 600,
    justifyContent: 'center',
  },
  name: {
    fontWeight: 600,
    color: '#555',
    flexShrink: 0,
  },
  myName: {
    color: '#667eea',
  },
  text: {
    wordBreak: 'break-word',
  },
  inputRow: {
    display: 'flex',
    borderTop: '1px solid #ddd',
    padding: '0.4rem',
    gap: '0.4rem',
    flexShrink: 0,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '0.85rem',
    outline: 'none',
  },
  sendBtn: {
    flexShrink: 0,
    padding: '0.5rem 0.7rem',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
};
