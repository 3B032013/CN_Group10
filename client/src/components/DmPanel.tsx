import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useDmStore } from '../store/dmStore';
import { getSocket } from '../hooks/useSocket';

export default function DmPanel() {
  const { myId } = useGameStore();
  const { conversations, unread, openWith, names, onlineUsers, openChat, closeChat, clearUnread } = useDmStore();
  const [showPanel, setShowPanel] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const currentMessages = openWith ? (conversations[openWith] ?? []) : [];
  const peerName = openWith ? (names[openWith] ?? '?') : '';

  // Online users excluding myself
  const others = onlineUsers.filter(u => u.id !== myId);

  // History: peers we've chatted with, sorted by last message time
  const historyPeers = Object.keys(conversations)
    .filter(id => id !== myId && conversations[id].length > 0)
    .sort((a, b) => {
      const lastA = conversations[a].at(-1)?.timestamp ?? 0;
      const lastB = conversations[b].at(-1)?.timestamp ?? 0;
      return lastB - lastA;
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  useEffect(() => {
    if (openWith) clearUnread(openWith);
  }, [openWith, currentMessages.length]);

  function handleSend() {
    if (!input.trim() || !openWith) return;
    getSocket().emit('dm:send', { toId: openWith, text: input.trim() });
    setInput('');
  }

  function handleOpenChat(peerId: string, peerName: string) {
    openChat(peerId, peerName);
    setShowPanel(false);
  }

  function handleFabClick() {
    if (openWith) {
      closeChat();
    } else {
      setShowPanel(v => !v);
    }
  }

  // Don't render if socket not connected yet
  if (!myId) return null;

  return (
    <>
      {/* ── Chat window ───────────────────────────────────── */}
      {openWith && (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <button style={styles.iconBtn} onClick={() => { closeChat(); setShowPanel(true); }}>←</button>
            <span style={styles.chatPeerName}>💬 {peerName}</span>
            <button style={styles.iconBtn} onClick={() => closeChat()}>✕</button>
          </div>

          <div style={styles.messages}>
            {currentMessages.length === 0 && (
              <p style={styles.emptyMsg}>Say hi to {peerName}!</p>
            )}
            {currentMessages.map((msg, i) => {
              const isMine = msg.fromId === myId;
              return (
                <div key={i} style={{ ...styles.bubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                  {!isMine && <div style={styles.bubbleName}>{msg.fromName}</div>}
                  <div>{msg.text}</div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={styles.inputRow}>
            <input
              style={styles.input}
              value={input}
              placeholder="Type a message…"
              maxLength={200}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              autoFocus
            />
            <button style={styles.sendBtn} onClick={handleSend}>Send</button>
          </div>
        </div>
      )}

      {/* ── Player / history panel ────────────────────────── */}
      {showPanel && !openWith && (
        <div style={styles.listPanel}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>Messages</span>
            <button style={styles.iconBtn} onClick={() => setShowPanel(false)}>✕</button>
          </div>

          {/* Online now — fixed height zone */}
          <div style={styles.zone}>
            <div style={styles.sectionLabel}>🟢 Online ({others.length})</div>
            <div style={styles.zoneScroll}>
              {others.length === 0 ? (
                <p style={styles.emptyMsg}>No one else online yet.</p>
              ) : (
                others.map(u => (
                  <button key={u.id} style={styles.userBtn} onClick={() => handleOpenChat(u.id, u.name)}>
                    <span style={styles.dot} />
                    <span style={styles.userName}>{u.name}</span>
                    {(unread[u.id] ?? 0) > 0 && (
                      <span style={styles.badge}>{unread[u.id]}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={styles.divider} />

          {/* Recent conversations — fixed height zone, always visible */}
          <div style={styles.zone}>
            <div style={styles.sectionLabel}>💬 Recent</div>
            <div style={styles.zoneScroll}>
              {historyPeers.length === 0 ? (
                <p style={styles.emptyMsg}>No conversations yet.</p>
              ) : (
                historyPeers.map(id => {
                  const name = names[id] ?? id;
                  const last = conversations[id].at(-1);
                  const isOnline = others.some(u => u.id === id);
                  return (
                    <button key={id} style={styles.userBtn} onClick={() => handleOpenChat(id, name)}>
                      <span style={{ ...styles.dot, background: isOnline ? '#22c55e' : '#ccc' }} />
                      <div style={styles.historyInfo}>
                        <span style={styles.userName}>{name}</span>
                        {last && (
                          <span style={styles.lastMsg}>
                            {last.fromId === myId ? 'You: ' : ''}{last.text}
                          </span>
                        )}
                      </div>
                      {(unread[id] ?? 0) > 0 && (
                        <span style={styles.badge}>{unread[id]}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating button ───────────────────────────────── */}
      <button style={styles.fab} onClick={handleFabClick} title="Messages">
        💬
        {totalUnread > 0 && !openWith && (
          <span style={styles.fabBadge}>{totalUnread > 9 ? '9+' : totalUnread}</span>
        )}
      </button>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fab: {
    position: 'fixed',
    bottom: '1.5rem',
    right: '1.5rem',
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    fontSize: '1.4rem',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(102,126,234,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  fabBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    background: '#ef4444',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '0.65rem',
    fontWeight: 700,
    width: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
  },
  listPanel: {
    position: 'fixed',
    bottom: '5rem',
    right: '1.5rem',
    width: 250,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    zIndex: 199,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.7rem 0.9rem',
    background: '#667eea',
    color: '#fff',
    flexShrink: 0,
  },
  listTitle: { fontWeight: 700, fontSize: '0.95rem' },
  zone: {
    height: 180,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  zoneScroll: {
    flex: 1,
    overflowY: 'auto',
  },
  divider: {
    height: 1,
    background: '#e8e8e8',
    flexShrink: 0,
  },
  sectionLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#999',
    padding: '0.5rem 0.9rem 0.2rem',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  userBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.9rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.875rem',
    transition: 'background 0.1s',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
    flexShrink: 0,
  },
  userName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  lastMsg: {
    fontSize: '0.75rem',
    color: '#aaa',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 10,
    fontSize: '0.7rem',
    fontWeight: 700,
    minWidth: 18,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    flexShrink: 0,
  },
  chatWindow: {
    position: 'fixed',
    bottom: '5rem',
    right: '1.5rem',
    width: 280,
    height: 380,
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    zIndex: 199,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.6rem 0.7rem',
    background: '#667eea',
    color: '#fff',
    flexShrink: 0,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0 0.2rem',
    lineHeight: 1,
    flexShrink: 0,
  },
  chatPeerName: {
    flex: 1,
    fontWeight: 700,
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.6rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  emptyMsg: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: '0.85rem',
    marginTop: '2rem',
  },
  bubble: {
    maxWidth: '80%',
    padding: '0.4rem 0.7rem',
    borderRadius: 10,
    fontSize: '0.85rem',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  myBubble: {
    alignSelf: 'flex-end',
    background: '#667eea',
    color: '#fff',
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    background: '#f0f0f0',
    color: '#333',
    borderBottomLeftRadius: 2,
  },
  bubbleName: {
    fontSize: '0.7rem',
    fontWeight: 700,
    marginBottom: 2,
    opacity: 0.7,
  },
  inputRow: {
    display: 'flex',
    borderTop: '1px solid #eee',
    padding: '0.4rem',
    gap: '0.4rem',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: '0.45rem 0.6rem',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '0.85rem',
    outline: 'none',
  },
  sendBtn: {
    flexShrink: 0,
    padding: '0.45rem 0.7rem',
    background: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
};
