import React, { useState } from "react";
import { Search, Plus, Radio, Zap, Pin, VolumeX, Archive, ShieldAlert, Trash2, Camera } from "lucide-react";
import { Chat, getSvgAvatarUrl } from "../types";
import { QRScannerModal } from "./QRScannerModal";

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onConnectNewPeer: (peerIdOrMultiaddr: string) => void;
  onPinChat: (chatId: string) => void;
  onMuteChat: (chatId: string) => void;
  onArchiveChat: (chatId: string) => void;
  onBlockPeer: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onConnectNewPeer,
  onPinChat,
  onMuteChat,
  onArchiveChat,
  onBlockPeer,
  onDeleteChat,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPeer, setShowAddPeer] = useState(false);
  const [peerInput, setPeerInput] = useState("");
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Swipe Gestures state
  const [swipeChatId, setSwipeChatId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    chatId: string;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId,
    });
  };

  const handleAddPeerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (peerInput.trim()) {
      onConnectNewPeer(peerInput.trim());
      setPeerInput("");
      setShowAddPeer(false);
    }
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, chatId: string) => {
    setTouchStartX(e.touches[0].clientX);
    setSwipeChatId(chatId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeChatId) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX;
    
    // Limit swipe offset to -120px to +120px
    const offset = Math.max(-120, Math.min(120, diff));
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!swipeChatId) return;
    
    // Snap thresholds
    if (swipeOffset < -50) {
      setSwipeOffset(-90); // Slide left, reveal right actions (Mute, Archive)
    } else if (swipeOffset > 50) {
      setSwipeOffset(90);  // Slide right, reveal left actions (Block, Delete)
    } else {
      // Snap shut
      setSwipeOffset(0);
      setSwipeChatId(null);
    }
  };

  const clearSwipe = () => {
    setSwipeOffset(0);
    setSwipeChatId(null);
  };

  const archivedCount = chats.filter((c) => c.isArchived).length;

  // Filter by search query
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle between active and archived views
  const activeChats = filteredChats.filter((chat) =>
    showArchivedOnly ? chat.isArchived : !chat.isArchived
  );

  // Sort pinned chats to the top
  const sortedChats = [...activeChats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="chat-list-container glass-panel">
      {/* Header with Search and Add buttons */}
      <div className="chat-list-header">
        <div className="header-title-row">
          <h2>{showArchivedOnly ? "Archived Peers" : "Active Peers"}</h2>
          <div className="header-actions-group">
            <button
              onClick={() => setShowArchivedOnly(!showArchivedOnly)}
              className={`archive-toggle-btn ${showArchivedOnly ? "active" : ""}`}
              title={showArchivedOnly ? "Show active chats" : "Show archived chats"}
            >
              <Archive size={16} />
              {archivedCount > 0 && !showArchivedOnly && (
                <span className="archive-badge-count">{archivedCount}</span>
              )}
            </button>
            {!showArchivedOnly && (
              <button
                onClick={() => setShowAddPeer(!showAddPeer)}
                className={`add-peer-btn ${showAddPeer ? "active" : ""}`}
                title="Connect to peer"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>

        {showAddPeer && !showArchivedOnly && (
          <form onSubmit={handleAddPeerSubmit} className="add-peer-form animate-slide-down">
            <div className="add-peer-input-wrapper glass-element">
              <input
                type="text"
                placeholder="Enter ID"
                value={peerInput}
                onChange={(e) => setPeerInput(e.target.value)}
                className="peer-input"
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="scanner-trigger-btn"
                title="Scan QR Code"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  padding: "0 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent-blue)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <Camera size={16} />
              </button>
              <button type="submit" className="peer-submit-btn">
                <Zap size={14} />
                <span>Link</span>
              </button>
            </div>
          </form>
        )}

        <div className="search-bar-wrapper glass-element">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={showArchivedOnly ? "Search archived..." : "Search conversations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Chat List Items */}
      <div className="chat-list-scroll">
        {sortedChats.length === 0 ? (
          <div className="no-chats">
            <Radio size={32} className="no-chats-icon" />
            <p>{showArchivedOnly ? "No archived peer connections." : "No active peer connections."}</p>
            {!showArchivedOnly && (
              <button onClick={() => setShowAddPeer(true)} className="glass-button">
                Connect Peer
              </button>
            )}
          </div>
        ) : (
          sortedChats.map((chat) => {
            const lastMessage = chat.messages[chat.messages.length - 1];
            const isSelected = chat.id === selectedChatId;
            const statusClass = `status-dot ${chat.status}`;

            return (
              <div key={chat.id} className="chat-item-wrapper">
                {/* Underlay swipe actions */}
                {swipeChatId === chat.id && (
                  <div className="swipe-actions-underlay">
                    {swipeOffset > 0 ? (
                      <div className="swipe-actions-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBlockPeer(chat.id);
                            clearSwipe();
                          }}
                          className="swipe-action-btn block"
                          title="Block"
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                            clearSwipe();
                          }}
                          className="swipe-action-btn delete"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="swipe-actions-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMuteChat(chat.id);
                            clearSwipe();
                          }}
                          className="swipe-action-btn mute"
                          title="Mute"
                        >
                          <VolumeX size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveChat(chat.id);
                            clearSwipe();
                          }}
                          className="swipe-action-btn archive"
                          title="Archive"
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Foreground Card */}
                <div
                  onClick={() => {
                    if (swipeChatId === chat.id && swipeOffset !== 0) {
                      clearSwipe();
                    } else {
                      onSelectChat(chat.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  onTouchStart={(e) => handleTouchStart(e, chat.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform: swipeChatId === chat.id ? `translateX(${swipeOffset}px)` : "none",
                  }}
                  className={`chat-item glass-card-hover ${isSelected ? "selected" : ""} ${
                    chat.isPinned ? "pinned-chat-item" : ""
                  }`}
                >
                  {/* Avatar with Status Indicator */}
                  <div className="avatar-wrapper">
                    <img
                      src={chat.avatar.startsWith("data:") || chat.avatar.includes("/") ? chat.avatar : getSvgAvatarUrl(chat.name, chat.avatarColor)}
                      className="avatar-circle"
                      alt={chat.name}
                      style={{ border: "none", objectFit: "cover" }}
                    />
                    <span className={statusClass}></span>
                    {chat.isBlocked && (
                      <span className="blocked-badge" title="Peer Blocked">
                        <ShieldAlert size={10} />
                      </span>
                    )}
                  </div>

                  {/* Chat details */}
                  <div className="chat-item-details">
                    <div className="chat-item-header">
                      <span className={`chat-item-name ${chat.isBlocked ? "blocked-peer-name" : ""}`}>
                        {chat.name}
                      </span>
                      <div className="chat-item-header-meta">
                        {chat.isPinned && <Pin size={12} className="pin-icon" />}
                        <span className="chat-item-time">
                          {lastMessage ? lastMessage.timestamp : ""}
                        </span>
                      </div>
                    </div>

                    <div className="chat-item-body">
                      <span className="chat-item-preview">
                        {chat.isBlocked ? (
                          <span className="blocked-text">🔒 Peer Blocked</span>
                        ) : chat.status === "typing..." ? (
                          <span className="typing-text">typing...</span>
                        ) : lastMessage ? (
                          lastMessage.text
                        ) : (
                          "No messages yet"
                        )}
                      </span>

                      <div className="chat-item-body-meta">
                        {chat.isMuted && <VolumeX size={12} className="mute-icon" />}
                        {chat.unreadCount > 0 && !chat.isMuted && (
                          <span className="unread-badge animate-pulse">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom Context Menu Overlay */}
      {contextMenu && (
        <>
          <div
            className="context-menu-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="context-menu-container glass-element animate-scale-up"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                onPinChat(contextMenu.chatId);
                setContextMenu(null);
              }}
            >
              <Pin size={14} className="menu-icon" />
              <span>
                {chats.find((c) => c.id === contextMenu.chatId)?.isPinned
                  ? "Unpin Chat"
                  : "Pin Chat"}
              </span>
            </button>
            <button
              onClick={() => {
                onMuteChat(contextMenu.chatId);
                setContextMenu(null);
              }}
            >
              <VolumeX size={14} className="menu-icon" />
              <span>
                {chats.find((c) => c.id === contextMenu.chatId)?.isMuted
                  ? "Unmute Chat"
                  : "Mute Chat"}
              </span>
            </button>
            <button
              onClick={() => {
                onArchiveChat(contextMenu.chatId);
                setContextMenu(null);
              }}
            >
              <Archive size={14} className="menu-icon" />
              <span>
                {chats.find((c) => c.id === contextMenu.chatId)?.isArchived
                  ? "Unarchive"
                  : "Archive Chat"}
              </span>
            </button>
            <button
              onClick={() => {
                onBlockPeer(contextMenu.chatId);
                setContextMenu(null);
              }}
              className="danger-action"
            >
              <ShieldAlert size={14} className="menu-icon" />
              <span>
                {chats.find((c) => c.id === contextMenu.chatId)?.isBlocked
                  ? "Unblock Peer"
                  : "Block Peer"}
              </span>
            </button>
            <div className="context-menu-divider" />
            <button
              onClick={() => {
                onDeleteChat(contextMenu.chatId);
                setContextMenu(null);
              }}
              className="danger-action"
            >
              <Trash2 size={14} className="menu-icon" />
              <span>Delete Chat</span>
            </button>
          </div>
        </>
      )}

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(scannedText) => {
          setPeerInput(scannedText);
          setShowScanner(false);
        }}
      />
    </div>
  );
};
