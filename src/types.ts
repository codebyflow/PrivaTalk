export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSender: boolean;
  status: "sent" | "delivered" | "read";
  attachment?: {
    type: "image" | "file";
    name: string;
    size?: string;
    url?: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string; // fallback color gradient
  status: "online" | "offline" | "typing..." | "away";
  lastSeen?: string;
  unreadCount: number;
  messages: Message[];
  peerId: string; // P2P Peer Public Key
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  isBlocked?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  status: "online" | "offline" | "away";
  statusMessage: string;
  peerId: string;
  isMuted?: boolean;
  isBlocked?: boolean;
}

export interface Call {
  id: string;
  name: string;
  avatar: string;
  avatarColor: string;
  type: "audio" | "video";
  direction: "incoming" | "outgoing" | "missed";
  timestamp: string;
  duration?: string;
}
