import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Smile,
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
  Download,
  CornerUpLeft,
  Mic,
  Play,
  Pause,
  Trash2,
  Hourglass,
  Shield,
  Key,
  Search,
  AlertCircle
} from "lucide-react";
import { Chat, getSvgAvatarUrl } from "../types";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ChatAreaProps {
  chat: Chat | null;
  onSendMessage: (
    text: string,
    attachment?: { type: "image" | "file" | "audio"; name: string; base64?: string; duration?: string },
    replyTo?: { id: string; senderName: string; text: string }
  ) => void;
  onBackToList?: () => void;
  onTyping: (isTyping: boolean) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onSetEphemeralTimer: (chatId: string, timerSeconds: number) => void;
  onVerifyPeer: (chatId: string, isVerified: boolean) => void;
  wallpaper?: string;
  onRetryMessage?: (messageId: string) => void;
}

const AudioPlayer: React.FC<{ url: string; duration?: string }> = ({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setTotalDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.warn);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = parseFloat(e.target.value);
    setCurrentTime(audio.currentTime);
  };

  const formatAudioTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="audio-attachment-player glass-element">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button type="button" onClick={togglePlay} className="play-pause-btn glass-button-round">
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <div className="player-seekbar-row">
        <input
          type="range"
          min="0"
          max={totalDuration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="audio-seeker"
        />
        <div className="audio-duration-meta">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{duration || formatAudioTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  onSendMessage,
  onBackToList,
  onTyping,
  onAddReaction,
  onSetEphemeralTimer,
  onVerifyPeer,
  wallpaper,
  onRetryMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: "image" | "file"; base64?: string } | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Replies & Reactions
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Verification & Disappearing timer modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false);

  // Drag and drop overlay
  const [isDragging, setIsDragging] = useState(false);

  // Shared Media gallery sub-tab
  const [detailSubTab, setDetailSubTab] = useState<"info" | "media">("info");

  // File Transfer simulated progress spinner map
  const [progressMap, setProgressMap] = useState<{ [msgId: string]: number }>({});

  // In-Chat Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // File Transfer simulated progress scheduler
  useEffect(() => {
    if (!chat) return;
    chat.messages.forEach((msg) => {
      if (msg.attachment && progressMap[msg.id] === undefined) {
        setProgressMap((prev) => ({ ...prev, [msg.id]: 0 }));
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += Math.floor(Math.random() * 25) + 15;
          if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(interval);
          }
          setProgressMap((prev) => ({ ...prev, [msg.id]: currentProgress }));
        }, 200);
      }
    });
  }, [chat?.messages?.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
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

  const renderMessageText = (msg: any) => {
    const text = msg.text;
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
      const url = matches[0];
      let title = "URL Link Preview";
      let desc = "Open-graph link details metadata summary...";
      let domain = "";
      try {
        domain = new URL(url).hostname;
      } catch (err) {
        domain = "link";
      }
      
      if (url.includes("github.com")) {
        title = "GitHub: Let's build from here";
        desc = "GitHub is where over 100 million developers shape the future of software, hosting source repositories.";
      } else if (url.includes("google.com")) {
        title = "Google Search Index";
        desc = "Search the world's information, including webpages, images, videos, and interactive maps.";
      } else if (url.includes("unsplash.com")) {
        title = "Unsplash: Beautiful Free Images";
        desc = "Beautiful, free images and photos that you can download and use for any project.";
      }
      
      return (
        <>
          <p className="message-text">
            {text.split(url).map((part: string, i: number) => (
              <React.Fragment key={i}>
                {part}
                {i === 0 && <a href={url} target="_blank" rel="noreferrer" className="chat-message-link" style={{ color: "#7c4dff", textDecoration: "underline" }}>{url}</a>}
              </React.Fragment>
            ))}
          </p>
          <a href={url} target="_blank" rel="noreferrer" className="url-preview-card glass-element animate-fade-in" style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            marginTop: "8px",
            padding: "10px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            textDecoration: "none",
            color: "white"
          }}>
            <span style={{ fontSize: "0.75em", opacity: 0.5, textTransform: "uppercase" }}>{domain}</span>
            <strong style={{ fontSize: "0.9em", color: "#7c4dff" }}>{title}</strong>
            <p style={{ fontSize: "0.8em", opacity: 0.8, margin: 0 }}>{desc}</p>
          </a>
        </>
      );
    }
    return <p className="message-text">{text}</p>;
  };

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const rawBase64 = base64data.split(",")[1];
            
            const mins = Math.floor(recordingSeconds / 60);
            const secs = recordingSeconds % 60;
            const durationStr = `${mins}:${secs.toString().padStart(2, "0")}`;

            onSendMessage("", {
              type: "audio",
              name: `voice-note-${Date.now()}.webm`,
              base64: rawBase64,
              duration: durationStr
            });
          };
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Could not start microphone recording:", err);
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (!shouldSend) {
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
  };

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
        : undefined,
      replyingToMessage
        ? {
            id: replyingToMessage.id,
            senderName: replyingToMessage.senderName,
            text: replyingToMessage.text,
          }
        : undefined
    );
    setInputText("");
    setSelectedFile(null);
    setReplyingToMessage(null);
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
    <div
      className="chat-area-container glass-panel"
      onDragOver={handleDragOver}
      style={{ position: "relative" }}
    >
      {/* Full-screen Drag and Drop Overlay */}
      {isDragging && (
        <div
          className="drag-drop-overlay glass-panel animate-fade-in"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10, 10, 15, 0.7)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            borderRadius: "16px",
            pointerEvents: "auto"
          }}
        >
          <div className="pulse-animation" style={{ color: "#7c4dff", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <Paperclip size={48} />
            <h3 style={{ margin: 0 }}>Drop files to attach</h3>
            <p style={{ opacity: 0.6, fontSize: "0.9em" }}>Support images and documents up to 25 MB</p>
          </div>
        </div>
      )}
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

          <img
            src={chat.avatar.startsWith("data:") || chat.avatar.includes("/") ? chat.avatar : getSvgAvatarUrl(chat.name, chat.avatarColor)}
            className="header-avatar"
            alt={chat.name}
            style={{ border: "none", objectFit: "cover" }}
          />

          <div className="header-peer-info">
            <div className="header-peer-name">
              <span>{chat.name}</span>
              {chat.isVerified && (
                <span title="Verified Safety Key Fingerprint" style={{ color: "#4caf50", display: "flex", alignItems: "center" }}>
                  <ShieldCheck size={14} style={{ fill: "rgba(76, 175, 80, 0.2)" }} />
                </span>
              )}
              <span title="End-to-End Encrypted Peer Connection">
                <ShieldCheck size={14} className="encrypted-badge" />
              </span>
            </div>
            <span className={`header-peer-status ${chat.status === "online" ? "online" : ""}`}>
              {chat.status} {(chat.ephemeralTimer || 0) > 0 && `(⌛ ${chat.ephemeralTimer}s)`}
            </span>
          </div>
        </div>

        <div className="chat-header-actions" style={{ position: "relative" }}>
          <button
            onClick={() => setShowVerifyModal(true)}
            className={`glass-button-round ${chat.isVerified ? "verified-active" : ""}`}
            title="Verify Peer Key Fingerprint"
            style={{ color: chat.isVerified ? "#4caf50" : undefined }}
          >
            <Key size={18} />
          </button>
          <button
            onClick={() => setShowEphemeralMenu(!showEphemeralMenu)}
            className="glass-button-round"
            title="Disappearing Messages"
            style={{ color: (chat.ephemeralTimer || 0) > 0 ? "#ff9800" : undefined }}
          >
            <Hourglass size={18} />
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`glass-button-round ${showSearch ? "active" : ""}`}
            title="Search active chat history"
            style={{ color: showSearch ? "#7c4dff" : undefined }}
          >
            <Search size={18} />
          </button>
          <button className="glass-button-round" title="Voice Call (P2P)">
            <Phone size={18} />
          </button>
          <button className="glass-button-round" title="Video Call (P2P)">
            <Video size={18} />
          </button>

          {showEphemeralMenu && (
            <div className="ephemeral-dropdown glass-element animate-fade-in" style={{
              position: "absolute",
              top: "45px",
              right: "0px",
              zIndex: 50,
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              background: "rgba(30, 30, 40, 0.95)",
              minWidth: "130px"
            }}>
              <span style={{ fontSize: "0.75em", opacity: 0.6, margin: "2px 8px 4px 8px" }}>Self-Destruct:</span>
              {[
                { label: "Off", val: 0 },
                { label: "10 seconds", val: 10 },
                { label: "1 minute", val: 60 },
                { label: "1 hour", val: 3600 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    onSetEphemeralTimer(chat.id, opt.val);
                    setShowEphemeralMenu(false);
                  }}
                  className={`dropdown-item ${chat.ephemeralTimer === opt.val ? "active" : ""}`}
                  style={{
                    background: chat.ephemeralTimer === opt.val ? "rgba(124, 77, 255, 0.2)" : "none",
                    border: "none",
                    color: "white",
                    padding: "6px 10px",
                    textAlign: "left",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8em"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* In-Chat Search bar dropdown */}
      {showSearch && (
        <div className="in-chat-search-bar glass-element animate-slide-down" style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)"
        }}>
          <Search size={14} style={{ opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "white",
              outline: "none",
              fontSize: "0.85em"
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="glass-button-round" style={{ padding: "2px", border: "none" }}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Main Grid: Messages + Optional Details Drawer */}
      <div className="chat-body-layout">
        {/* Messages Feed */}
        <div className="messages-feed-wrapper" style={{
          background: wallpaper === "aurora"
            ? "linear-gradient(135deg, rgba(38, 70, 83, 0.45), rgba(42, 157, 143, 0.45))"
            : wallpaper === "sunset"
            ? "linear-gradient(135deg, rgba(230, 57, 70, 0.2), rgba(29, 53, 87, 0.45))"
            : wallpaper === "matrix"
            ? "radial-gradient(rgba(124, 77, 255, 0.12) 1px, transparent 1px), rgba(10, 10, 15, 0.45)"
            : undefined,
          backgroundSize: wallpaper === "matrix" ? "20px 20px" : undefined
        }}>
          <div className="messages-scroll">
            {chat.messages
              .filter((m) => !searchQuery || m.text.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((msg) => {
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
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  style={{ position: "relative" }}
                >
                  <div className={`message-bubble ${isSender ? "outgoing-bubble" : "incoming-bubble"}`}>
                    {!isSender && <span className="message-sender">{msg.senderName}</span>}

                    {/* Render Quoted Reply Quote Block */}
                    {msg.replyTo && (
                      <div className="reply-quote-preview glass-element" style={{ marginBottom: "8px", padding: "6px 10px", borderLeft: "3px solid #7c4dff", background: "rgba(255,255,255,0.04)", borderRadius: "4px" }}>
                        <span className="reply-quote-sender" style={{ fontSize: "0.8em", fontWeight: "bold", color: "#7c4dff", display: "block" }}>{msg.replyTo.senderName}</span>
                        <p className="reply-quote-text" style={{ fontSize: "0.85em", margin: 0, opacity: 0.8, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{msg.replyTo.text}</p>
                      </div>
                    )}

                    {/* Render attachment if available */}
                    {msg.attachment && (
                      <div className="message-attachment glass-element" style={{ position: "relative" }}>
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
                        ) : msg.attachment.type === "audio" ? (
                          <AudioPlayer url={getAttachmentUrl(msg.attachment.url)} duration={msg.attachment.duration} />
                        ) : (
                          <div className="attachment-file-wrapper">
                            <FileText size={24} className="file-icon" />
                            <div className="file-details">
                              <span className="file-name">{msg.attachment.name}</span>
                              <span className="file-size">{msg.attachment.size}</span>
                            </div>
                          </div>
                        )}

                        {/* Simulated Transfer Progress Ring overlay */}
                        {progressMap[msg.id] !== undefined && progressMap[msg.id] < 100 && (
                          <div className="transfer-progress-overlay" style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0,0,0,0.65)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 10,
                            borderRadius: "8px",
                            flexDirection: "column",
                            gap: "4px"
                          }}>
                            <div className="spinner-progress" style={{
                              width: "24px",
                              height: "24px",
                              border: "3px solid rgba(255,255,255,0.2)",
                              borderTop: "3px solid #7c4dff",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite"
                            }} />
                            <span style={{ fontSize: "0.75em", color: "white", fontWeight: "bold" }}>{progressMap[msg.id]}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {renderMessageText(msg)}

                    {/* Reactions Capsule List */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="message-reactions-list" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                        {msg.reactions.map((r, ri) => (
                          <div
                            key={ri}
                            className="reaction-capsule glass-element"
                            title={`Reacted by: ${r.senders.join(", ")}`}
                            onClick={() => onAddReaction(msg.id, r.emoji)}
                            style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "10px", fontSize: "0.8em", cursor: "pointer", background: "rgba(255,255,255,0.06)" }}
                          >
                            <span>{r.emoji}</span>
                            <span className="reaction-count" style={{ opacity: 0.8 }}>{r.count}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="message-meta">
                      <span className="message-time">{msg.timestamp}</span>
                      {isSender && (
                        <span className="message-status">
                          {msg.status === "failed" ? (
                            <button
                              type="button"
                              onClick={() => onRetryMessage && onRetryMessage(msg.id)}
                              style={{ background: "none", border: "none", color: "#ff5252", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                              title="Message failed to send. Click to retry."
                            >
                              <AlertCircle size={14} />
                            </button>
                          ) : msg.status === "read" ? (
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

                  {/* Inline Action Toolbar (Reactions & Reply button) */}
                  {hoveredMessageId === msg.id && (
                    <div className={`message-action-toolbar glass-element animate-fade-in`} style={{
                      position: "absolute",
                      top: "-28px",
                      [isSender ? "right" : "left"]: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      borderRadius: "15px",
                      zIndex: 20,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      background: "rgba(20, 20, 25, 0.75)"
                    }}>
                      {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onAddReaction(msg.id, emoji)}
                          className="reaction-pick-btn"
                          style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", fontSize: "1.1em", transition: "transform 0.15s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
                        >
                          {emoji}
                        </button>
                      ))}
                      <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
                      <button
                        type="button"
                        onClick={() => setReplyingToMessage(msg)}
                        className="msg-reply-action-btn glass-button-round"
                        title="Reply"
                        style={{ border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", background: "none", color: "rgba(255,255,255,0.7)" }}
                      >
                        <CornerUpLeft size={13} />
                      </button>
                    </div>
                  )}
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
              <div className="panel-section" style={{ paddingBottom: 0 }}>
                <div className="panel-avatar-row">
                  <img
                    src={chat.avatar.startsWith("data:") || chat.avatar.includes("/") ? chat.avatar : getSvgAvatarUrl(chat.name, chat.avatarColor)}
                    className="panel-avatar"
                    alt={chat.name}
                    style={{ border: "none", objectFit: "cover" }}
                  />
                  <h4>{chat.name}</h4>
                  <span className="status-tag online">{chat.status}</span>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="details-subtabs" style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setDetailSubTab("info")}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: "white",
                    padding: "8px",
                    cursor: "pointer",
                    borderBottom: detailSubTab === "info" ? "2px solid #7c4dff" : "none",
                    opacity: detailSubTab === "info" ? 1 : 0.6,
                    fontWeight: detailSubTab === "info" ? "bold" : "normal",
                    outline: "none"
                  }}
                >
                  Info
                </button>
                <button
                  type="button"
                  onClick={() => setDetailSubTab("media")}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: "white",
                    padding: "8px",
                    cursor: "pointer",
                    borderBottom: detailSubTab === "media" ? "2px solid #7c4dff" : "none",
                    opacity: detailSubTab === "media" ? 1 : 0.6,
                    fontWeight: detailSubTab === "media" ? "bold" : "normal",
                    outline: "none"
                  }}
                >
                  Media
                </button>
              </div>

              {detailSubTab === "info" ? (
                <>
                  <div className="panel-section glass-element">
                    <div className="info-row">
                      <Network size={14} className="info-row-icon" />
                      <span className="info-label">Peer Identity (Ed25519)</span>
                    </div>
                    <div className="info-value-block">
                      <code>{chat.peerId}</code>
                    </div>
                  </div>
                </>
              ) : (
                <div className="shared-media-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                  {chat.messages
                    .filter((m) => m.attachment)
                    .map((m) => {
                      const att = m.attachment!;
                      if (att.type === "image") {
                        return (
                          <img
                            key={m.id}
                            src={getAttachmentUrl(att.url) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=60"}
                            alt={att.name}
                            onClick={() => {
                              setLightboxUrl(getAttachmentUrl(att.url) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60");
                              setZoomScale(1);
                            }}
                            style={{ width: "100%", height: "60px", objectFit: "cover", borderRadius: "6px", cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)" }}
                          />
                        );
                      } else {
                        return (
                          <div
                            key={m.id}
                            className="gallery-file-card glass-element"
                            title={att.name}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60px", borderRadius: "6px", fontSize: "0.7em", padding: "4px", textAlign: "center", wordBreak: "break-all", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <FileText size={16} style={{ color: "#7c4dff" }} />
                            <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.8 }}>{att.name}</span>
                          </div>
                        );
                      }
                    })}
                  {chat.messages.filter((m) => m.attachment).length === 0 && (
                    <span style={{ gridColumn: "span 3", opacity: 0.6, fontSize: "0.9em", textAlign: "center", padding: "20px 0" }}>No shared media.</span>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Chat Footer/Input Bar */}
      <footer className="chat-footer">
        {replyingToMessage && (
          <div className="reply-preview-bar glass-element animate-slide-up" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.03)",
            borderLeft: "4px solid #7c4dff",
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px"
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.8em", fontWeight: "bold", color: "#7c4dff" }}>Replying to {replyingToMessage.senderName}</span>
              <span style={{ fontSize: "0.85em", opacity: 0.8, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{replyingToMessage.text}</span>
            </div>
            <button onClick={() => setReplyingToMessage(null)} className="glass-button-round" style={{ padding: "4px" }}>
              <X size={14} />
            </button>
          </div>
        )}

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

        {isRecording ? (
          <div className="voice-recorder-bar glass-element" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 14px", borderRadius: "10px", background: "rgba(30, 20, 25, 0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="pulse-animation" style={{ color: "#ff3b30", fontSize: "0.9em", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff3b30", display: "inline-block" }}></span> Recording Voice Note
              </span>
              <span style={{ fontSize: "0.95em", fontFamily: "monospace", opacity: 0.8 }}>
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => stopRecording(false)} className="glass-button-round" style={{ background: "rgba(255, 59, 48, 0.15)", color: "#ff3b30", display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px" }} title="Discard Recording">
                <Trash2 size={16} />
              </button>
              <button type="button" onClick={() => stopRecording(true)} className="glass-button-round" style={{ background: "rgba(76, 175, 80, 0.15)", color: "#4caf50", display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px" }} title="Send Voice Note">
                <Check size={16} />
              </button>
            </div>
          </div>
        ) : (
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

            {!inputText.trim() && !selectedFile ? (
              <button
                type="button"
                onClick={startRecording}
                className="send-btn mic-btn glass-button-primary"
                style={{ background: "rgba(255, 255, 255, 0.08)", color: "white" }}
                title="Record Voice Note"
                disabled={chat.isBlocked}
              >
                <Mic size={18} />
              </button>
            ) : (
              <button type="submit" className="send-btn glass-button-primary" title="Send encrypted message" disabled={chat.isBlocked}>
                <Send size={18} />
              </button>
            )}
          </form>
        )}

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

      {/* Cryptographic Key Verification Modal */}
      {showVerifyModal && (
        <div className="custom-modal-overlay glass-panel animate-fade-in" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 10, 15, 0.6)",
          backdropFilter: "blur(15px)"
        }}>
          <div className="custom-modal-card glass-element animate-scale-up" style={{
            width: "90%",
            maxWidth: "450px",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            background: "rgba(30, 30, 40, 0.85)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "1.25em" }}>
                <Shield size={20} style={{ color: "#7c4dff" }} /> Peer Key Safety Numbers
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="glass-button-round" style={{ padding: "4px" }}>
                <X size={16} />
              </button>
            </div>
            
            <p style={{ fontSize: "0.85em", opacity: 0.7, lineHeight: 1.5, marginBottom: "20px" }}>
              To verify the security of your end-to-end encryption with <strong>{chat.name}</strong>, compare the safety numbers below with their device. If they match, your connection is fully trusted.
            </p>

            {/* Render 12 sets of 5 safety numbers dynamically based on peerId hash code */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.03)",
              fontFamily: "monospace",
              fontSize: "1.1em",
              letterSpacing: "1px",
              textAlign: "center",
              marginBottom: "24px",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              {Array.from({ length: 12 }).map((_, idx) => {
                const charCodeSum = chat.peerId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0) * (idx + 1), 0);
                const blockVal = (10000 + (charCodeSum % 90000)).toString();
                return <span key={idx} style={{ opacity: 0.9 }}>{blockVal}</span>;
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <span style={{ fontSize: "0.85em", opacity: 0.8 }}>
                Status: {chat.isVerified ? "✅ Verified" : "⚠️ Unverified"}
              </span>
              <button
                type="button"
                onClick={() => {
                  onVerifyPeer(chat.id, !chat.isVerified);
                  setShowVerifyModal(false);
                }}
                className={`glass-button-primary`}
                style={{
                  background: chat.isVerified ? "rgba(244, 67, 54, 0.2)" : "rgba(76, 175, 80, 0.2)",
                  border: chat.isVerified ? "1px solid #f44336" : "1px solid #4caf50",
                  color: chat.isVerified ? "#ff5252" : "#4caf50",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.9em",
                  fontWeight: "bold"
                }}
              >
                {chat.isVerified ? "Mark as Unverified" : "Mark as Verified"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
