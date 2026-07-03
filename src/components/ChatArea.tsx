import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Lock,
  ShieldCheck,
  Check,
  CheckCheck,
  ArrowLeft,
  FileText,
  X,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download
} from "lucide-react";
import { Chat } from "../types";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ChatAreaProps {
  chat: Chat | null;
  onSendMessage: (text: string, attachment?: { type: "image" | "file"; name: string; base64?: string }) => void;
  onBackToList?: () => void;
  onTyping: (isTyping: boolean) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ chat, onSendMessage, onBackToList, onTyping }) => {
  const [inputText, setInputText] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: "image" | "file"; base64?: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const typingTimeoutRef = useRef<any>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);

  // Clean up typing timers on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onTyping(false);
    }, 1500);
  };

  const getAttachmentUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    try {
      return convertFileSrc(url);
    } catch (err) {
      console.warn("convertFileSrc failed:", err);
      return url;
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className="chat-area-container empty glass-panel">
        <div className="empty-chat-state">
          <div className="empty-chat-icon-wrapper pulse-animation">
            <Lock size={48} className="empty-icon" />
          </div>
          <h3>Select a peer to start messaging</h3>
          <p>
            PrivaTalk uses decentralized peer-to-peer transport layers. All conversations are locally
            encrypted using standard Noise protocols.
          </p>
        </div>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    onSendMessage(
      inputText.trim(),
      selectedFile
        ? {
            type: selectedFile.type,
            name: selectedFile.name,
            base64: selectedFile.base64,
          }
        : undefined
    );
    setInputText("");
    setSelectedFile(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const isImage = file.type.startsWith("image/");
        setSelectedFile({
          name: file.name,
          type: isImage ? "image" : "file",
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const emojis = ["😀", "😂", "🥰", "👍", "👎", "🔒", "🔑", "🦀", "🔥", "💻", "🚀", "🎉", "👀", "💡"];

  return (
    <div className="chat-area-container glass-panel">
      {/* Chat Header */}
      <header className="chat-header">
        <div
          className="chat-header-left"
          onClick={() => setShowDetails(!showDetails)}
          style={{ cursor: "pointer" }}
          title="Click to view peer info"
        >
          {onBackToList && (
            <button onClick={(e) => { e.stopPropagation(); onBackToList(); }} className="back-btn glass-button-round mobile-only">
              <ArrowLeft size={18} />
            </button>
          )}

          <div
            className="header-avatar"
            style={{ background: chat.avatarColor || "#cbd5e1" }}
          >
            {chat.avatar}
          </div>

          <div className="header-peer-info">
            <div className="header-peer-name">
              <span>{chat.name}</span>
              <span title="End-to-End Encrypted Peer Connection">
                <ShieldCheck size={14} className="encrypted-badge" />
              </span>
            </div>
            <span className={`header-peer-status ${chat.status === "online" ? "online" : ""}`}>
              {chat.status}
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button className="glass-button-round" title="Voice Call (P2P)">
            <Phone size={18} />
          </button>
          <button className="glass-button-round" title="Video Call (P2P)">
            <Video size={18} />
          </button>
          <button className="glass-button-round" title="More options">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Main Grid: Messages + Optional Details Drawer */}
      <div className="chat-body-layout">
        {/* Messages Feed */}
        <div className="messages-feed-wrapper">
          <div className="messages-scroll">
            {chat.messages.map((msg) => {
              if (msg.senderId === "system") {
                return (
                  <div key={msg.id} className="system-message-row">
                    <span className="system-message-bubble glass-element">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isSender = msg.isSender;

              return (
                <div
                  key={msg.id}
                  className={`message-row ${isSender ? "outgoing" : "incoming"}`}
                >
                  <div className={`message-bubble ${isSender ? "outgoing-bubble" : "incoming-bubble"}`}>
                    {!isSender && <span className="message-sender">{msg.senderName}</span>}

                    {/* Render attachment if available */}
                    {msg.attachment && (
                      <div className="message-attachment glass-element">
                        {msg.attachment.type === "image" ? (
                          <div
                            className="attachment-image-wrapper"
                            style={{ cursor: "zoom-in" }}
                            onClick={() => {
                              setLightboxUrl(getAttachmentUrl(msg.attachment!.url) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60");
                              setZoomScale(1);
                            }}
                          >
                            <img
                              src={getAttachmentUrl(msg.attachment.url) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60"}
                              alt={msg.attachment.name}
                              className="attachment-img"
                            />
                            <span className="attachment-img-name">{msg.attachment.name}</span>
                          </div>
                        ) : (
                          <div className="attachment-file-wrapper">
                            <FileText size={24} className="file-icon" />
                            <div className="file-details">
                              <span className="file-name">{msg.attachment.name}</span>
                              <span className="file-size">{msg.attachment.size}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="message-text">{msg.text}</p>

                    <div className="message-meta">
                      <span className="message-time">{msg.timestamp}</span>
                      {isSender && (
                        <span className="message-status">
                          {msg.status === "read" ? (
                            <CheckCheck size={14} className="status-icon read" />
                          ) : msg.status === "delivered" ? (
                            <CheckCheck size={14} className="status-icon" />
                          ) : (
                            <Check size={14} className="status-icon" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Peer Details Panel (Glassmorphic drawer) */}
        {showDetails && (
          <aside className="peer-details-panel glass-element animate-slide-left">
            <div className="panel-header">
              <h3>Node Metadata</h3>
              <button onClick={() => setShowDetails(false)} className="close-panel-btn">
                <X size={16} />
              </button>
            </div>

            <div className="panel-body">
              <div className="panel-section">
                <div className="panel-avatar-row">
                  <div
                    className="panel-avatar"
                    style={{ background: chat.avatarColor || "#cbd5e1" }}
                  >
                    {chat.avatar}
                  </div>
                  <h4>{chat.name}</h4>
                  <span className="status-tag online">{chat.status}</span>
                </div>
              </div>

              <div className="panel-section glass-element">
                <div className="info-row">
                  <Network size={14} className="info-row-icon" />
                  <span className="info-label">Peer Identity (Ed25519)</span>
                </div>
                <div className="info-value-block">
                  <code>{chat.peerId}</code>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Chat Footer/Input Bar */}
      <footer className="chat-footer">
        {selectedFile && (
          <div className="selected-file-preview glass-element animate-slide-up">
            <div className="file-preview-content">
              <FileText size={16} className="file-icon" />
              <span className="file-preview-name">{selectedFile.name}</span>
              <span className="file-preview-type">({selectedFile.type})</span>
            </div>
            <button onClick={removeSelectedFile} className="remove-file-btn">
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="input-form">
          <div className="input-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="glass-button-round"
              title="Attach File"
              disabled={chat.isBlocked}
            >
              <Paperclip size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`glass-button-round ${showEmojiPicker ? "active" : ""}`}
              title="Insert Emoji"
              disabled={chat.isBlocked}
            >
              <Smile size={18} />
            </button>
          </div>

          <div className="text-input-wrapper glass-element">
            <input
              type="text"
              placeholder={chat.isBlocked ? "🔒 Unblock peer to send messages..." : "Write a message..."}
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="message-input"
              disabled={chat.isBlocked}
            />
          </div>

          <button type="submit" className="send-btn glass-button-primary" title="Send encrypted message" disabled={chat.isBlocked}>
            <Send size={18} />
          </button>
        </form>

        {showEmojiPicker && (
          <div className="emoji-picker-drawer glass-element animate-slide-up">
            <div className="emoji-picker-header">
              <span>Quick Reaction Emojis</span>
              <button onClick={() => setShowEmojiPicker(false)} className="close-emoji-btn">
                <X size={12} />
              </button>
            </div>
            <div className="emoji-grid">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="emoji-btn"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </footer>

      {/* Interactive Lightbox Overlay */}
      {lightboxUrl && (
        <div className="image-lightbox-overlay glass-panel animate-fade-in" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-card glass-element animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">Image Attachment Viewport</span>
              <div className="lightbox-controls">
                <button
                  onClick={() => setZoomScale((prev) => Math.min(prev + 0.25, 3))}
                  className="glass-button-round control-btn"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setZoomScale((prev) => Math.max(prev - 0.25, 0.5))}
                  className="glass-button-round control-btn"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={() => setZoomScale(1)}
                  className="glass-button-round control-btn"
                  title="Reset Zoom"
                >
                  <Maximize2 size={16} />
                </button>
                <a
                  href={lightboxUrl}
                  download="attachment-image"
                  target="_blank"
                  rel="noreferrer"
                  className="glass-button-round control-btn"
                  title="Open/Download"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => setLightboxUrl(null)}
                  className="glass-button-round control-btn close-btn"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="lightbox-body" style={{ overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", maxHeight: "70vh" }}>
              <img
                src={lightboxUrl}
                alt="Lightbox Preview"
                style={{
                  transform: `scale(${zoomScale})`,
                  transition: "transform 0.2s ease-out",
                  maxWidth: "95%",
                  maxHeight: "65vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
