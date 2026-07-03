import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatList } from "./components/ChatList";
import { ChatArea } from "./components/ChatArea";
import { ContactsView } from "./components/ContactsView";
import { CallsView } from "./components/CallsView";
import { SettingsView, AppSettings } from "./components/SettingsView";
import { mockChats as initialChats, mockContacts as initialContacts, mockCalls as initialCalls } from "./mockData";
import { Chat, Message, Contact, Call } from "./types";
import { Video, PhoneOff, Phone, Mic, MicOff, VideoOff, Volume2, Shield, X, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { Titlebar } from "./components/Titlebar";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "calls" | "settings">("chats");
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [copiedProfileId, setCopiedProfileId] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");

  // WebRTC Stream refs and states
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Local Peer Details
  const myPeerId = "12D3KooWN4G2r21jH8c6uH3uN9p1G2aE4r5t6y7u8i9o0p";

  // App Settings State
  const [settings, setSettings] = useState<AppSettings>({
    profileName: "Rust Dev",
    profileStatus: "Building P2P Networks 🦀",
    glassOpacity: 0.15,
    glassBlur: 20,
    bgTheme: "neon",
    p2pTransport: "quic",
    enableMdns: true,
    enableDht: true,
    enableRelay: true,
    bindAddress: "/ip4/0.0.0.0/udp/4001/quic-v1",
  });

  // Call State
  const [activeCall, setActiveCall] = useState<{
    name: string;
    avatar: string;
    avatarColor: string;
    type: "audio" | "video";
    status: "ringing" | "connected";
    direction?: "incoming" | "outgoing";
    sdpOffer?: any;
    chatId?: string;
  } | null>(null);

  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Call timer effect
  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === "connected") {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Load database entities on app launch
  useEffect(() => {
    const bootstrapFromDb = async () => {
      try {
        const dbSettings = await invoke<AppSettings>("load_settings");
        setSettings(dbSettings);

        const dbChats = await invoke<Chat[]>("get_chats");
        setChats(dbChats);

        const dbContacts = await invoke<Contact[]>("get_contacts");
        setContacts(dbContacts);

        const dbCalls = await invoke<Call[]>("get_calls");
        setCalls(dbCalls);
      } catch (err) {
        console.warn("Could not bootstrap database:", err);
        setNetworkStatus("disconnected");
      }
    };
    bootstrapFromDb();

    // Simulate libp2p bootstrap search delay
    const timer = setTimeout(() => {
      setNetworkStatus("connected");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Request notification permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Listen for real-time incoming libp2p Gossipsub/KadDHT swarm events
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    
    const setupListener = async () => {
      try {
        const unlisten = await listen<{ chatId: string; message: Message }>(
          "p2p-receive-message",
          (event) => {
            const { chatId, message } = event.payload;
            
            // Append incoming message to state
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    messages: [...chat.messages, message],
                    unreadCount: chat.id === selectedChatId ? 0 : chat.unreadCount + 1,
                  };
                }
                return chat;
              })
            );
            
            // Trigger native OS push notification
            if (
              "Notification" in window &&
              Notification.permission === "granted" &&
              (!document.hasFocus() || chatId !== selectedChatId)
            ) {
              new Notification(`New message from ${message.senderName}`, {
                body: message.text,
              });
            }

            // Save incoming message in SQLite database
            invoke("send_db_message", { chatId, message }).catch(console.error);
          }
        );
        unlistenFn = unlisten;
      } catch (err) {
        console.error("Failed to register Tauri event listener:", err);
      }
    };
    
    setupListener();
    
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [selectedChatId]);

  // Listen for real-time WebRTC typing alerts, read receipts, calling signals, reactions, and ephemeral timers
  useEffect(() => {
    let unlistenTyping: (() => void) | null = null;
    let unlistenRead: (() => void) | null = null;
    let unlistenOffer: (() => void) | null = null;
    let unlistenAnswer: (() => void) | null = null;
    let unlistenCandidate: (() => void) | null = null;
    let unlistenReaction: (() => void) | null = null;
    let unlistenEphemeral: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        unlistenTyping = await listen<{ chatId: string; isTyping: boolean }>(
          "webrtc-typing",
          (event) => {
            const { chatId, isTyping } = event.payload;
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    status: isTyping ? "typing..." : "online",
                  };
                }
                return chat;
              })
            );
          }
        );

        unlistenRead = await listen<{ chatId: string; messageId: string }>(
          "webrtc-read-receipt",
          (event) => {
            const { chatId, messageId } = event.payload;
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    messages: chat.messages.map((m) =>
                      m.id === messageId ? { ...m, status: "read" } : m
                    ),
                  };
                }
                return chat;
              })
            );
          }
        );

        unlistenOffer = await listen<{ offer: any; chatId: string; name: string; type: "audio" | "video"; from: string }>(
          "webrtc-offer",
          (event) => {
            const payload = event.payload;
            if (payload.from !== myPeerId && !activeCall) {
              setActiveCall({
                name: payload.name,
                avatar: payload.name.charAt(0),
                avatarColor: "linear-gradient(135deg, #007aff 0%, #0056b3 100%)",
                type: payload.type,
                status: "ringing",
                direction: "incoming",
                sdpOffer: payload.offer,
                chatId: payload.chatId
              });
            }
          }
        );

        unlistenAnswer = await listen<{ answer: any; chatId: string }>(
          "webrtc-answer",
          async (event) => {
            const { answer } = event.payload;
            if (pcRef.current) {
              try {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                setActiveCall((prev) => prev ? { ...prev, status: "connected" } : null);
              } catch (err) {
                console.warn("Failed to set remote answer:", err);
              }
            }
          }
        );

        unlistenCandidate = await listen<{ candidate: any; from: string }>(
          "webrtc-ice-candidate",
          async (event) => {
            const { candidate, from } = event.payload;
            if (from !== myPeerId && pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.warn("Failed to add ice candidate:", err);
              }
            }
          }
        );

        unlistenReaction = await listen<{ chatId: string; messageId: string; emoji: string; senderName: string }>(
          "webrtc-reaction",
          (event) => {
            const { chatId, messageId, emoji, senderName } = event.payload;
            setChats((prevChats) =>
              prevChats.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) => {
                      if (msg.id === messageId) {
                        const currentReactions = msg.reactions || [];
                        const existingReaction = currentReactions.find((r) => r.emoji === emoji);
                        
                        let nextReactions;
                        if (existingReaction) {
                          const hasReacted = existingReaction.senders.includes(senderName);
                          const nextSenders = hasReacted
                            ? existingReaction.senders.filter((s) => s !== senderName)
                            : [...existingReaction.senders, senderName];
                            
                          if (nextSenders.length === 0) {
                            nextReactions = currentReactions.filter((r) => r.emoji !== emoji);
                          } else {
                            nextReactions = currentReactions.map((r) =>
                              r.emoji === emoji ? { ...r, count: nextSenders.length, senders: nextSenders } : r
                            );
                          }
                        } else {
                          nextReactions = [...currentReactions, { emoji, count: 1, senders: [senderName] }];
                        }

                        const updatedMsg = { ...msg, reactions: nextReactions };
                        invoke("send_db_message", { chatId, message: updatedMsg }).catch(console.error);
                        return updatedMsg;
                      }
                      return msg;
                    })
                  };
                }
                return chat;
              })
            );
          }
        );

        unlistenEphemeral = await listen<{ chatId: string; timerSeconds: number }>(
          "webrtc-ephemeral-timer",
          (event) => {
            const { chatId, timerSeconds } = event.payload;
            setChats((prev) =>
              prev.map((c) => (c.id === chatId ? { ...c, ephemeralTimer: timerSeconds } : c))
            );
          }
        );
      } catch (err) {
        console.error("Failed to setup WebRTC sign sync listeners:", err);
      }
    };

    setupListeners();

    return () => {
      if (unlistenTyping) unlistenTyping();
      if (unlistenRead) unlistenRead();
      if (unlistenOffer) unlistenOffer();
      if (unlistenAnswer) unlistenAnswer();
      if (unlistenCandidate) unlistenCandidate();
      if (unlistenReaction) unlistenReaction();
      if (unlistenEphemeral) unlistenEphemeral();
    };
  }, [activeCall, myPeerId]);

  // Auto read incoming messages and send read receipt events to peer
  useEffect(() => {
    if (selectedChatId) {
      const activeChat = chats.find((c) => c.id === selectedChatId);
      if (activeChat) {
        activeChat.messages.forEach((msg) => {
          if (!msg.isSender && msg.status !== "read") {
            emit("p2p-relay-event", {
              eventName: "webrtc-read-receipt",
              payload: { chatId: selectedChatId, messageId: msg.id }
            }).catch(console.error);
          }
        });
      }
    }
  }, [selectedChatId, chats]);

  // Handle local typing alerts emission
  const handleLocalTyping = (isTyping: boolean) => {
    if (!selectedChatId) return;
    emit("p2p-relay-event", {
      eventName: "webrtc-typing",
      payload: { chatId: selectedChatId, isTyping }
    }).catch(console.error);
  };

  // Handle local emoji reaction triggers
  const handleLocalReaction = (messageId: string, emoji: string) => {
    if (!selectedChatId) return;
    emit("p2p-relay-event", {
      eventName: "webrtc-reaction",
      payload: { chatId: selectedChatId, messageId, emoji, senderName: settings.profileName }
    }).catch(console.error);
  };

  // Handle ephemeral disappearing message timer configuration
  const handleSetEphemeralTimer = async (chatId: string, timerSeconds: number) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, ephemeralTimer: timerSeconds } : c))
    );
    try {
      await invoke("set_ephemeral_timer", { chatId, timerSeconds });
      emit("p2p-relay-event", {
        eventName: "webrtc-ephemeral-timer",
        payload: { chatId, timerSeconds }
      }).catch(console.error);
    } catch (err) {
      console.error("Failed to update ephemeral timer:", err);
    }
  };

  // Handle cryptographic safety number peer verification
  const handleVerifyPeer = async (chatId: string, isVerified: boolean) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isVerified } : c))
    );
    try {
      await invoke("verify_peer", { chatId, isVerified });
    } catch (err) {
      console.error("Failed to verify peer:", err);
    }
  };

  // Process disappearing messages count-down timers
  useEffect(() => {
    chats.forEach((chat) => {
      const timer = chat.ephemeralTimer || 0;
      if (timer > 0) {
        chat.messages.forEach((msg) => {
          if (msg.status === "read") {
            const cacheKey = `disappear-timer-${msg.id}`;
            if (!(window as any)[cacheKey]) {
              (window as any)[cacheKey] = setTimeout(async () => {
                setChats((prev) =>
                  prev.map((c) => {
                    if (c.id === chat.id) {
                      return {
                        ...c,
                        messages: c.messages.filter((m) => m.id !== msg.id),
                      };
                    }
                    return c;
                  })
                );
                invoke("delete_db_message", { chatId: chat.id, messageId: msg.id }).catch(console.error);
                delete (window as any)[cacheKey];
              }, timer * 1000);
            }
          }
        });
      }
    });
  }, [chats]);

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    try {
      await invoke("save_settings", { settings: nextSettings });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  // WebRTC Media Stream Handler for outgoing calls
  useEffect(() => {
    const startWebRTCCall = async () => {
      if (!activeCall || activeCall.direction !== "outgoing") return;
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          emit("p2p-relay-event", {
            eventName: "webrtc-ice-candidate",
            payload: { candidate: e.candidate, from: myPeerId }
          }).catch(console.error);
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeCall.type === "video",
        });
        setLocalStream(stream);

        // Mount local camera stream immediately
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }, 100);

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emit("p2p-relay-event", {
          eventName: "webrtc-offer",
          payload: {
            offer,
            chatId: activeCall.chatId,
            name: settings.profileName,
            type: activeCall.type,
            from: myPeerId
          }
        }).catch(console.error);

        // Simulated Peer Echo Loopback (For offline node calling cards testing)
        if (activeCall.name.startsWith("Node [")) {
          setTimeout(async () => {
            const mockPC = new RTCPeerConnection();
            stream.getTracks().forEach((t) => mockPC.addTrack(t, stream));
            mockPC.onicecandidate = (e) => {
              if (e.candidate && pcRef.current) {
                pcRef.current.addIceCandidate(new RTCIceCandidate(e.candidate)).catch(console.warn);
              }
            };
            mockPC.ontrack = (e) => {
              setRemoteStream(e.streams[0]);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = e.streams[0];
              }
            };
            await mockPC.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await mockPC.createAnswer();
            await mockPC.setLocalDescription(answer);

            emit("p2p-relay-event", {
              eventName: "webrtc-answer",
              payload: { answer, chatId: activeCall.chatId }
            }).catch(console.error);
          }, 1500);
        }
      } catch (err) {
        console.warn("Unable to capture media streams:", err);
      }
    };

    if (activeCall) {
      if (activeCall.direction === "outgoing") {
        startWebRTCCall();
      }
    } else {
      // Cleanup streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    }
  }, [activeCall?.chatId]);

  // Toggle audio muted tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Toggle camera video tracks
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCamOff;
      });
    }
  }, [isCamOff, localStream]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Sync theme changes with DOM body classes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  const currentChat = chats.find((c) => c.id === selectedChatId) || null;

  // Send Message Logic
  const handleSendMessage = async (
    text: string,
    attachment?: { type: "image" | "file" | "audio"; name: string; base64?: string; duration?: string },
    replyTo?: { id: string; senderName: string; text: string }
  ) => {
    if (!selectedChatId) return;

    let savedPath = "";
    if (attachment && attachment.base64) {
      try {
        savedPath = await invoke<string>("save_attachment", {
          name: attachment.name,
          base64Data: attachment.base64,
        });
      } catch (err) {
        console.error("Failed to save attachment locally:", err);
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = {
      id: `msg-user-${Date.now()}`,
      senderId: "me",
      senderName: settings.profileName,
      text,
      timestamp,
      isSender: true,
      status: "sent",
      attachment: attachment
        ? {
            type: attachment.type,
            name: attachment.name,
            size: attachment.type === "image" ? "450 KB" : (attachment.type === "audio" ? "120 KB" : "1.8 MB"),
            url: savedPath || (attachment.type === "image" ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60" : undefined),
            duration: attachment.duration,
          }
        : undefined,
      replyTo,
    };

    // Add user message
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMsg],
          };
        }
        return chat;
      })
    );

    // Save message to SQLite
    invoke("send_db_message", { chatId: selectedChatId, message: newMsg }).catch(console.error);

    // Emit to libp2p Rust background thread
    emit("p2p-send-message", { chatId: selectedChatId, ...newMsg }).catch(console.error);

    // Simulate tick updates
    const messageId = newMsg.id;

    // After 800ms -> Delivered
    setTimeout(() => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === selectedChatId) {
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === messageId ? { ...m, status: "delivered" } : m
              ),
            };
          }
          return chat;
        })
      );
    }, 800);

    // After 1600ms -> Read + Trigger Typing status
    setTimeout(() => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === selectedChatId) {
            // Trigger auto reply sequences
            triggerAutoReply(chat.id, chat.name);
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === messageId ? { ...m, status: "read" } : m
              ),
              status: "typing...",
            };
          }
          return chat;
        })
      );
    }, 1600);
  };

  // Mock Automated Chat replies
  const triggerAutoReply = (chatId: string, peerName: string) => {
    setTimeout(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const replies = [
        `Received message! Processing P2P decryption. Everything is running smoothly on my end.`,
        `Nice. Did you try tweaking the Glass sliders in Settings? The blur and transparency adapt in real-time.`,
        `Rust compiles so fast with these optimization flags. By the way, the Noise handshake looks solid.`,
        `Yes! I'm seeing 12ms ping on the QUIC transport. Let's draft the multi-peer swarm tests next.`,
      ];
      const randomText = replies[Math.floor(Math.random() * replies.length)];

      const replyMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        senderId: "peer",
        senderName: peerName,
        text: randomText,
        timestamp,
        isSender: false,
        status: "read",
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              status: "online",
              messages: [...chat.messages, replyMsg],
            };
          }
          return chat;
        })
      );

      // Save auto-reply to SQLite
      invoke("send_db_message", { chatId, message: replyMsg }).catch(console.error);
    }, 2000);
  };

  // Connect to new peer multiaddress
  const handleConnectNewPeer = async (peerInput: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isMultiaddr = peerInput.startsWith("/");
    const peerId = isMultiaddr
      ? peerInput.split("/").pop() || "UnknownPeerID"
      : peerInput;
    const peerName = `Node [${peerId.slice(0, 6)}...]`;

    const chatCardId = `chat-${Date.now()}`;
    const newChat: Chat = {
      id: chatCardId,
      name: peerName,
      avatar: peerName.charAt(5).toUpperCase(),
      avatarColor: `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)} 0%, #111d42 100%)`,
      status: "online",
      unreadCount: 0,
      peerId: peerId,
      messages: [
        {
          id: `sys-${Date.now()}-1`,
          senderId: "system",
          senderName: "System",
          text: `⚡ Dialing bootstrap address: ${peerInput}`,
          timestamp,
          isSender: false,
          status: "read",
        },
        {
          id: `sys-${Date.now()}-2`,
          senderId: "system",
          senderName: "System",
          text: `🔒 Peer handshake success. TLS Upgrade complete. Session key established.`,
          timestamp,
          isSender: false,
          status: "read",
        },
      ],
    };

    setChats((prev) => [newChat, ...prev]);
    setSelectedChatId(newChat.id);
    setActiveTab("chats");

    // Add to contacts
    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name: peerName,
      avatar: newChat.avatar,
      avatarColor: newChat.avatarColor,
      status: "online",
      statusMessage: "Connected via bootstrap link",
      peerId: peerId,
      isMuted: false,
      isBlocked: false,
    };
    setContacts((prev) => [newContact, ...prev]);

    try {
      await invoke("save_contact", { contact: newContact });
      await invoke("send_db_message", { chatId: chatCardId, message: newChat.messages[0] });
      await invoke("send_db_message", { chatId: chatCardId, message: newChat.messages[1] });
    } catch (err) {
      console.error(err);
    }
  };

  // Switch to Chat tab and focus on specific user
  const handleStartChatFromContact = async (contactName: string, peerId: string) => {
    const existingChat = chats.find((c) => c.peerId === peerId);
    if (existingChat) {
      setSelectedChatId(existingChat.id);
    } else {
      const chatCardId = `chat-${Date.now()}`;
      const bootstrapMsg: Message = {
        id: `sys-start-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        text: `🔒 Direct peer-to-peer session initiated.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isSender: false,
        status: "read",
      };

      const newChat: Chat = {
        id: chatCardId,
        name: contactName,
        avatar: contactName.charAt(0),
        avatarColor: "linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)",
        status: "online",
        unreadCount: 0,
        peerId,
        messages: [bootstrapMsg],
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);

      try {
        await invoke("send_db_message", { chatId: chatCardId, message: bootstrapMsg });
      } catch (err) {
        console.error(err);
      }
    }
    setActiveTab("chats");
    setMobileView("chat");
  };

  // Add contact manually
  const handleAddContact = async (name: string, peerId: string) => {
    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name,
      avatar: name.charAt(0).toUpperCase(),
      avatarColor: `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)} 0%, #7F00FF 100%)`,
      status: "offline",
      statusMessage: "Added to contacts roster",
      peerId,
      isMuted: false,
      isBlocked: false,
    };
    setContacts((prev) => [newContact, ...prev]);
    try {
      await invoke("save_contact", { contact: newContact });
    } catch (err) {
      console.error("Failed to save contact in SQLite:", err);
    }
  };

  // Call Initiation
  const handleStartCall = (name: string, type: "audio" | "video") => {
    const activeObj = chats.find((c) => c.name === name) || contacts.find((c) => c.name === name);
    const newCall: Call = {
      id: `call-${Date.now()}`,
      name,
      avatar: name.charAt(0),
      avatarColor: activeObj?.avatarColor || "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
      type,
      direction: "outgoing",
      timestamp: "Just Now",
      duration: "00:00",
    };

    setActiveCall({
      name,
      avatar: name.charAt(0),
      avatarColor: activeObj?.avatarColor || "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
      type,
      status: "ringing",
      direction: "outgoing",
      chatId: selectedChatId || `chat-${Date.now()}`
    });

    setCalls((prev) => [newCall, ...prev]);
    invoke("add_call_log", { call: newCall }).catch(console.error);
  };

  const handlePinChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextVal = !chat.isPinned;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: nextVal } : c))
    );
    try {
      await invoke("update_chat_status", { id: chatId, field: "isPinned", value: nextVal });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMuteChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextVal = !chat.isMuted;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isMuted: nextVal } : c))
    );
    setContacts((prevC) =>
      prevC.map((c) => (c.peerId === chat.peerId ? { ...c, isMuted: nextVal } : c))
    );
    try {
      await invoke("update_chat_status", { id: chatId, field: "isMuted", value: nextVal });
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveChat = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextVal = !chat.isArchived;
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isArchived: nextVal } : c))
    );
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
    try {
      await invoke("update_chat_status", { id: chatId, field: "isArchived", value: nextVal });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockPeer = async (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;
    const nextVal = !chat.isBlocked;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sysMsg: Message = {
      id: `sys-block-${Date.now()}`,
      senderId: "system",
      senderName: "System",
      text: nextVal ? "🔒 You blocked this peer." : "🔓 You unblocked this peer.",
      timestamp,
      isSender: false,
      status: "read",
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, isBlocked: nextVal, messages: [...c.messages, sysMsg] } : c
      )
    );
    setContacts((prevC) =>
      prevC.map((c) => (c.peerId === chat.peerId ? { ...c, isBlocked: nextVal } : c))
    );
    try {
      await invoke("update_chat_status", { id: chatId, field: "isBlocked", value: nextVal });
      await invoke("send_db_message", { chatId, message: sysMsg });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
    }
    try {
      await invoke("delete_chat", { id: chatId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    try {
      await invoke("delete_contact", { id: contactId });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMuteContact = async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const nextVal = !contact.isMuted;
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, isMuted: nextVal } : c))
    );
    const matchedChat = chats.find((chat) => chat.peerId === contact.peerId);
    if (matchedChat) {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.peerId === contact.peerId ? { ...chat, isMuted: nextVal } : chat
        )
      );
      try {
        await invoke("update_chat_status", { id: matchedChat.id, field: "isMuted", value: nextVal });
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await invoke("save_contact", { contact: { ...contact, isMuted: nextVal } });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBlockContact = async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const nextVal = !contact.isBlocked;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, isBlocked: nextVal } : c))
    );
    const matchedChat = chats.find((chat) => chat.peerId === contact.peerId);
    if (matchedChat) {
      const sysMsg: Message = {
        id: `sys-block-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        text: nextVal ? "🔒 You blocked this peer." : "🔓 You unblocked this peer.",
        timestamp,
        isSender: false,
        status: "read",
      };
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.peerId === contact.peerId) {
            return {
              ...chat,
              isBlocked: nextVal,
              messages: [...chat.messages, sysMsg],
            };
          }
          return chat;
        })
      );
      try {
        await invoke("update_chat_status", { id: matchedChat.id, field: "isBlocked", value: nextVal });
        await invoke("send_db_message", { chatId: matchedChat.id, message: sysMsg });
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        await invoke("save_contact", { contact: { ...contact, isBlocked: nextVal } });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall || !activeCall.sdpOffer) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        emit("p2p-relay-event", {
          eventName: "webrtc-ice-candidate",
          payload: { candidate: e.candidate, from: myPeerId }
        }).catch(console.error);
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.type === "video",
      });
      setLocalStream(stream);

      // Mount local video preview immediately
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(activeCall.sdpOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      emit("p2p-relay-event", {
        eventName: "webrtc-answer",
        payload: { answer, chatId: activeCall.chatId }
      }).catch(console.error);

      setActiveCall((prev) => prev ? { ...prev, status: "connected" } : null);
    } catch (err) {
      console.warn("Accept call stream error:", err);
    }
  };

  const handleEndCall = () => {
    if (activeCall && callTimer > 0) {
      // Update duration of the last call in the list
      const durationStr = formatTimer(callTimer);
      setCalls((prev) =>
        prev.map((c, i) => {
          if (i === 0) {
            const updatedCall = { ...c, duration: durationStr };
            // Re-insert finalized log to SQLite
            invoke("add_call_log", { call: updatedCall }).catch(console.error);
            return updatedCall;
          }
          return c;
        })
      );
    }
    
    // Close PeerConnection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    
    setActiveCall(null);
    setIsMuted(false);
    setIsCamOff(false);
  };

  return (
    <div className={`app-canvas theme-${settings.bgTheme} ${theme}`}>
      {/* Background Graphic Blobs */}
      <div className="dynamic-bg-blob blob-1"></div>
      <div className="dynamic-bg-blob blob-2"></div>
      <div className="dynamic-bg-blob blob-3"></div>

      <div className="app-workspace">
        <Titlebar />
        <div className="app-main-layout-row">
          {/* Navigation Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab === "chats") setMobileView("list");
            }}
            theme={theme}
            toggleTheme={toggleTheme}
            onProfileClick={() => setShowProfileModal(true)}
            profileAvatar={settings.profileAvatar}
            networkStatus={networkStatus}
          />

        {/* Dynamic Inner Layout */}
        <div className="app-content-container">
          {activeTab === "chats" && (
            <div className={`chats-layout-grid ${mobileView}`}>
              <ChatList
                chats={chats}
                selectedChatId={selectedChatId}
                onSelectChat={(id) => {
                  setSelectedChatId(id);
                  setMobileView("chat");
                  // Clear unread count
                  setChats((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
                  );
                }}
                onConnectNewPeer={handleConnectNewPeer}
                onPinChat={handlePinChat}
                onMuteChat={handleMuteChat}
                onArchiveChat={handleArchiveChat}
                onBlockPeer={handleBlockPeer}
                onDeleteChat={handleDeleteChat}
              />
              <ChatArea
                chat={currentChat}
                onSendMessage={handleSendMessage}
                onBackToList={() => setMobileView("list")}
                onTyping={handleLocalTyping}
                onAddReaction={handleLocalReaction}
                onSetEphemeralTimer={handleSetEphemeralTimer}
                onVerifyPeer={handleVerifyPeer}
              />
            </div>
          )}

          {activeTab === "contacts" && (
            <ContactsView
              contacts={contacts}
              onStartChat={handleStartChatFromContact}
              onAddContact={handleAddContact}
              onDeleteContact={handleDeleteContact}
              onMuteContact={handleMuteContact}
              onBlockContact={handleBlockContact}
            />
          )}

          {activeTab === "calls" && (
            <CallsView calls={calls} onStartCall={handleStartCall} />
          )}

          {activeTab === "settings" && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              myPeerId={myPeerId}
            />
          )}
        </div>
      </div>
    </div>

      {/* Calling Screen Modal (Glass Panel) */}
      {activeCall && (
        <div className="call-modal-overlay glass-panel animate-fade-in">
          <div className="call-card glass-element animate-scale-up">
            <div className="call-card-security">
              <Shield size={14} className="sec-icon" />
              <span>Secure Direct Endpoint</span>
            </div>

            <div className="call-card-profile">
              {activeCall.type === "video" && !isCamOff ? (
                <div className="video-stream-feed glass-element" style={{ overflow: "hidden" }}>
                  <video
                    ref={remoteVideoRef}
                    className="peer-video"
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span className="feed-tag">{activeCall.name}</span>
                </div>
              ) : (
                <div
                  className="call-profile-avatar pulse-animation"
                  style={{ background: activeCall.avatarColor }}
                >
                  {activeCall.avatar}
                </div>
              )}

              <h2>{activeCall.name}</h2>
              <span className="call-status">
                {activeCall.status === "ringing" ? (
                  <span className="ringing-text">P2P Connecting...</span>
                ) : (
                  <span className="timer-text">{formatTimer(callTimer)}</span>
                )}
              </span>
            </div>

            {/* Video overlay self preview */}
            {activeCall.type === "video" && !isCamOff && (
              <div className="self-video-preview glass-element" style={{ overflow: "hidden" }}>
                <video
                  ref={localVideoRef}
                  className="self-video"
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
                />
                <span className="self-feed-tag">Self</span>
              </div>
            )}

            <div className="call-controls">
              {activeCall.status === "ringing" && activeCall.direction === "incoming" ? (
                <>
                  <button
                    onClick={handleAcceptCall}
                    className="call-ctrl-btn accept-call-btn glass-button-round"
                    title="Accept Call"
                    style={{ background: "#27c93f", color: "white" }}
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="call-ctrl-btn end-call-btn glass-button-round"
                    title="Decline Call"
                  >
                    <PhoneOff size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`call-ctrl-btn glass-button-round ${isMuted ? "disabled" : ""}`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {activeCall.type === "video" && (
                    <button
                      onClick={() => setIsCamOff(!isCamOff)}
                      className={`call-ctrl-btn glass-button-round ${isCamOff ? "disabled" : ""}`}
                      title={isCamOff ? "Turn Cam On" : "Turn Cam Off"}
                    >
                      {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}

                  <button className="call-ctrl-btn glass-button-round" title="Speaker toggle">
                    <Volume2 size={20} />
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="call-ctrl-btn end-call-btn glass-button-round"
                    title="Hang Up"
                  >
                    <PhoneOff size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal (Glass Overlay) */}
      {showProfileModal && (
        <div className="profile-modal-overlay glass-panel animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card glass-element animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowProfileModal(false)} className="close-profile-btn glass-button-round" title="Close">
              <X size={16} />
            </button>

            <div className="profile-modal-avatar-row">
              <div
                className="profile-modal-avatar"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          handleUpdateSettings({ profileAvatar: event.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                title="Click to upload profile picture"
                style={{ cursor: "pointer" }}
              >
                {settings.profileAvatar ? (
                  <img src={settings.profileAvatar} className="profile-modal-avatar-img" alt="Avatar" />
                ) : (
                  "ME"
                )}
              </div>
              <h2>{settings.profileName}</h2>
              <span className="profile-modal-status">{settings.profileStatus}</span>
            </div>

            <div className="profile-modal-qr-section">
              <div className="qr-container-border">
                <div className="qr-code-bg">
                  <QRCodeSVG value={myPeerId} size={160} fgColor="#0d0e15" bgColor="#ffffff" level="M" />
                </div>
              </div>
              <span className="qr-code-instructions">Scan to link direct P2P endpoint</span>
            </div>

            <div className="profile-modal-key-section glass-element">
              <span className="key-sec-title">Public Peer Identity (Ed25519)</span>
              <div className="key-sec-box">
                <code>{myPeerId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(myPeerId);
                    setCopiedProfileId(true);
                    setTimeout(() => setCopiedProfileId(false), 2000);
                  }}
                  className="glass-button-round"
                  title="Copy Peer ID"
                >
                  {copiedProfileId ? <Check size={14} className="copied" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
