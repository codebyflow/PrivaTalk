export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSender: boolean;
  status: "sent" | "delivered" | "read" | "failed";
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

export const getSvgAvatarUrl = (name: string, color: string = "#7c4dff") => {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";
  
  const startColor = color;
  const endColor = "#121214";
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <linearGradient id="grad-${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#grad-${initials})" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="bold" font-size="36" fill="#ffffff">${initials}</text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
