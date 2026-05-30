import { create } from 'zustand';

export interface DmMessage {
  fromId: string;
  fromName: string;
  text: string;
  timestamp: number;
}

export interface OnlineUser {
  id: string;
  name: string;
}

interface DmState {
  conversations: Record<string, DmMessage[]>;
  unread: Record<string, number>;
  openWith: string | null;
  names: Record<string, string>;
  onlineUsers: OnlineUser[];

  addMessage: (peerId: string, peerName: string, msg: DmMessage) => void;
  openChat: (peerId: string, peerName: string) => void;
  closeChat: () => void;
  clearUnread: (peerId: string) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  reset: () => void;
}

export const useDmStore = create<DmState>((set) => ({
  conversations: {},
  unread: {},
  openWith: null,
  names: {},
  onlineUsers: [],

  addMessage: (peerId, peerName, msg) =>
    set((s) => {
      const prev = s.conversations[peerId] ?? [];
      const isOpen = s.openWith === peerId;
      return {
        conversations: { ...s.conversations, [peerId]: [...prev, msg] },
        unread: { ...s.unread, [peerId]: isOpen ? 0 : (s.unread[peerId] ?? 0) + 1 },
        names: { ...s.names, [peerId]: peerName },
      };
    }),

  openChat: (peerId, peerName) =>
    set((s) => ({
      openWith: peerId,
      unread: { ...s.unread, [peerId]: 0 },
      names: { ...s.names, [peerId]: peerName },
    })),

  closeChat: () => set({ openWith: null }),

  clearUnread: (peerId) =>
    set((s) => ({ unread: { ...s.unread, [peerId]: 0 } })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  reset: () => set({ conversations: {}, unread: {}, openWith: null, names: {} }),
}));
