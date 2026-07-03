export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSender: boolean;
  status: "sent" | "delivered" | "read";
  attachment?: {
    type: "image" | "file" | "audio";
    name: string;
    size?: string;
    url?: string;
    duration?: string;
  };
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: {
    emoji: string;
    count: number;
    senders: string[]; // List of senderNames/Ids who reacted
  }[];
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
  isVerified?: boolean; // Cryptographic Safety Key verified
  ephemeralTimer?: number; // Self-destruct delay in seconds (0 = disabled)
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
