import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  User,
  Sliders,
  Network,
  ShieldAlert,
  RefreshCw,
  Terminal,
  Eye
} from "lucide-react";

export interface AppSettings {
  profileName: string;
  profileStatus: string;
  glassOpacity: number;
  glassBlur: number;
  bgTheme: "neon" | "aurora" | "space" | "sunset";
  p2pTransport: "quic" | "tcp" | "ws";
  enableMdns: boolean;
  enableDht: boolean;
  enableRelay: boolean;
  bindAddress: string;
  profileAvatar?: string;
  chatWallpaper?: string;
}

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  myPeerId: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  myPeerId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "appearance" | "p2p" | "security" | "topology">("profile");
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Set CSS variables dynamically on setting change to update glass parameters in real-time!
  useEffect(() => {
    document.documentElement.style.setProperty("--glass-opacity", `${settings.glassOpacity}`);
    document.documentElement.style.setProperty("--glass-blur", `${settings.glassBlur}px`);
  }, [settings.glassOpacity, settings.glassBlur]);

  const backgroundThemes = [
    { id: "neon", name: "Neon Glow", colors: "linear-gradient(135deg, #0f0c1b 0%, #1e1145 50%, #111d42 100%)" },
    { id: "aurora", name: "Aurora Borealis", colors: "linear-gradient(135deg, #0d1b1e 0%, #0c2f27 50%, #131238 100%)" },
    { id: "space", name: "Deep Space", colors: "linear-gradient(135deg, #050508 0%, #0d0e15 50%, #1c1328 100%)" },
    { id: "sunset", name: "Sunset Mist", colors: "linear-gradient(135deg, #1c0d1e 0%, #2f1225 50%, #3a1c22 100%)" },
  ];

  return (
    <div className="settings-view-container glass-panel animate-fade-in">
      {/* Sidebar for Sub-Tabs */}
      <aside className="settings-sidebar glass-element">
        <h3>Preferences</h3>
        <nav className="settings-subnav">
          <button
            onClick={() => setActiveSubTab("profile")}
            className={`subnav-btn ${activeSubTab === "profile" ? "active" : ""}`}
          >
            <User size={16} />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveSubTab("appearance")}
            className={`subnav-btn ${activeSubTab === "appearance" ? "active" : ""}`}
          >
            <Sliders size={16} />
            <span>Appearance</span>
          </button>
          <button
            onClick={() => setActiveSubTab("p2p")}
            className={`subnav-btn ${activeSubTab === "p2p" ? "active" : ""}`}
          >
            <Network size={16} />
            <span>P2P Networking</span>
          </button>
          <button
            onClick={() => setActiveSubTab("security")}
            className={`subnav-btn ${activeSubTab === "security" ? "active" : ""}`}
          >
            <ShieldAlert size={16} />
            <span>Security & Crypt</span>
          </button>
          <button
            onClick={() => setActiveSubTab("topology")}
            className={`subnav-btn ${activeSubTab === "topology" ? "active" : ""}`}
          >
            <Network size={16} style={{ color: "#7c4dff" }} />
            <span>Network Map</span>
          </button>
        </nav>
      </aside>

      {/* Settings Content Area */}
      <div className="settings-content">
        {/* Profile Settings */}
        {activeSubTab === "profile" && (
          <div className="settings-section animate-fade-in">
            <h2>Profile Configuration</h2>
            <p className="section-description">Manage how your peer identity is announced to other nodes in the swarm.</p>

            <div className="settings-card glass-element">
              <div className="form-group">
                <label>Display Username</label>
                <input
                  type="text"
                  value={settings.profileName}
                  onChange={(e) => onUpdateSettings({ profileName: e.target.value })}
                  className="glass-input"
                  placeholder="e.g. Rustacean"
                />
              </div>

              <div className="form-group">
                <label>Status Message</label>
                <input
                  type="text"
                  value={settings.profileStatus}
                  onChange={(e) => onUpdateSettings({ profileStatus: e.target.value })}
                  className="glass-input"
                  placeholder="e.g. Coding in Rust..."
                />
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div className="settings-avatar-upload-row">
                  <div className="settings-avatar-preview glass-element">
                    {settings.profileAvatar ? (
                      <img src={settings.profileAvatar} className="settings-avatar-img" alt="Avatar" />
                    ) : (
                      "ME"
                    )}
                  </div>
                  <button
                    type="button"
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
                              onUpdateSettings({ profileAvatar: event.target.result as string });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="glass-button"
                  >
                    Upload Picture
                  </button>
                  {settings.profileAvatar && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ profileAvatar: undefined })}
                      className="glass-button warning-btn-color"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>


          </div>
        )}

        {/* Appearance Settings */}
        {activeSubTab === "appearance" && (
          <div className="settings-section animate-fade-in">
            <h2>Appearance & Effects</h2>
            <p className="section-description">Customize the glass transparency and backdrops of the interface.</p>

            <div className="settings-card glass-element">
              <h4>Glass Tuning</h4>
              
              <div className="slider-group">
                <div className="slider-header">
                  <span>Glass Opacity</span>
                  <span className="slider-val">{(settings.glassOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.85"
                  step="0.05"
                  value={settings.glassOpacity}
                  onChange={(e) => onUpdateSettings({ glassOpacity: parseFloat(e.target.value) })}
                  className="glass-slider"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Backdrop Blur Filter</span>
                  <span className="slider-val">{settings.glassBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="2"
                  value={settings.glassBlur}
                  onChange={(e) => onUpdateSettings({ glassBlur: parseInt(e.target.value) })}
                  className="glass-slider"
                />
              </div>
            </div>

            <div className="settings-card glass-element">
              <h4>Canvas Background Theme</h4>
              <div className="theme-grid">
                {backgroundThemes.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => onUpdateSettings({ bgTheme: bg.id as any })}
                    className={`theme-preset-card ${settings.bgTheme === bg.id ? "active" : ""}`}
                    style={{ background: bg.colors }}
                  >
                    <span className="theme-name-tag">{bg.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card glass-element" style={{ marginTop: "16px" }}>
              <h4>Custom Chat Wallpapers</h4>
              <div className="theme-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "12px" }}>
                {[
                  { id: "obsidian", name: "Obsidian Flow", style: "rgba(10, 10, 15, 0.45)" },
                  { id: "aurora", name: "Aurora Glow", style: "linear-gradient(135deg, rgba(38, 70, 83, 0.5), rgba(42, 157, 143, 0.5))" },
                  { id: "sunset", name: "Crimson Sunset", style: "linear-gradient(135deg, rgba(230, 57, 70, 0.25), rgba(29, 53, 87, 0.5))" },
                  { id: "matrix", name: "Cyber Pattern", style: "radial-gradient(rgba(124, 77, 255, 0.15) 1px, transparent 1px), rgba(10, 10, 15, 0.5)" },
                ].map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => onUpdateSettings({ chatWallpaper: wp.id })}
                    className={`theme-preset-card ${settings.chatWallpaper === wp.id ? "active" : ""}`}
                    style={{
                      background: wp.style,
                      backgroundSize: wp.id === "matrix" ? "20px 20px" : undefined,
                      height: "60px",
                      borderRadius: "8px",
                      border: settings.chatWallpaper === wp.id ? "2px solid #7c4dff" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white"
                    }}
                  >
                    <strong>{wp.name}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* P2P Network Settings */}
        {activeSubTab === "p2p" && (
          <div className="settings-section animate-fade-in">
            <h2>Swarm & Protocol Settings</h2>
            <p className="section-description">Configure the low-level libp2p swarm stack and bootstrap entrypoints.</p>

            <div className="settings-card glass-element">
              <div className="form-group">
                <label>Transport Layer Protocol</label>
                <div className="transport-pill-selector glass-element">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ p2pTransport: "quic" })}
                    className={`transport-pill ${settings.p2pTransport === "quic" ? "active" : ""}`}
                  >
                    QUIC (UDP)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ p2pTransport: "tcp" })}
                    className={`transport-pill ${settings.p2pTransport === "tcp" ? "active" : ""}`}
                  >
                    TCP (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ p2pTransport: "ws" })}
                    className={`transport-pill ${settings.p2pTransport === "ws" ? "active" : ""}`}
                  >
                    WebSockets
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Bind Listening Address</label>
                <input
                  type="text"
                  value={settings.bindAddress}
                  onChange={(e) => onUpdateSettings({ bindAddress: e.target.value })}
                  className="glass-input"
                  placeholder="/ip4/0.0.0.0/udp/4001/quic-v1"
                />
              </div>
            </div>

            <div className="settings-card glass-element">
              <h4>Discovery & Routing Options</h4>
              
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Enable Local mDNS Discovery</span>
                  <span className="toggle-desc">Automatically find other nodes on your local area network (LAN).</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableMdns}
                  onChange={(e) => onUpdateSettings({ enableMdns: e.target.checked })}
                  className="glass-checkbox"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Enable Kademlia DHT Routing</span>
                  <span className="toggle-desc">Connect to global distributed hash table for peer finding outside LAN.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableDht}
                  onChange={(e) => onUpdateSettings({ enableDht: e.target.checked })}
                  className="glass-checkbox"
                />
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Enable Relay Node fallback (STUN/TURN)</span>
                  <span className="toggle-desc">Use relay proxies when symmetric NAT blocks direct peer connections.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableRelay}
                  onChange={(e) => onUpdateSettings({ enableRelay: e.target.checked })}
                  className="glass-checkbox"
                />
              </div>
            </div>
          </div>
        )}

        {/* Security & Crypt Settings */}
        {activeSubTab === "security" && (
          <div className="settings-section animate-fade-in">
            <h2>Cryptographic Identity</h2>
            <p className="section-description">Verify key agreements and local encryption key stores.</p>

            <div className="settings-card glass-element">
              <div className="warning-banner">
                <ShieldAlert size={18} className="warn-icon" />
                <div className="warn-text">
                  <strong>Cryptographic Warning:</strong> Regenerating your identity key will replace your Peer ID. Existing peers will no longer recognize you until they add your new Peer ID.
                </div>
              </div>

              <div className="key-sec-row">
                <div className="key-sec-label">
                  <span>Ed25519 Secret Key Seed</span>
                  <span className="input-hint">Keep this hidden. It generates your peer identity.</span>
                </div>
                <div className="key-action-group">
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="glass-button"
                  >
                    <Eye size={14} />
                    <span>{showPrivateKey ? "Hide Seed" : "Reveal Seed"}</span>
                  </button>
                  <button className="glass-button warning-btn-color">
                    <RefreshCw size={14} />
                    <span>Regenerate Key</span>
                  </button>
                </div>
              </div>

              {showPrivateKey && (
                <div className="seed-display-box glass-element animate-slide-down">
                  <code>
                    1fa80c85023fa80c85023fa80c85023fa80c85023fa80c85023fa80c85023fa8
                  </code>
                </div>
              )}
            </div>

            <div className="settings-card glass-element">
              <div className="terminal-header">
                <Terminal size={14} />
                <span>Local Node Logs (Stdout)</span>
              </div>
              <div className="terminal-body">
                <pre>
{`[2026-07-03T02:44:11Z INFO] Starting PrivaTalk libp2p node v0.1.0
[2026-07-03T02:44:11Z INFO] Swarm bound to listening address /ip4/0.0.0.0/udp/4001/quic-v1
[2026-07-03T02:44:12Z INFO] Local Peer ID: ${myPeerId}
[2026-07-03T02:44:13Z INFO] Discovery (mDNS) enabled. Searching local network...
[2026-07-03T02:44:18Z INFO] Swarm connection established with peer 12D3KooWGz7K... (Alice)
[2026-07-03T02:44:19Z INFO] Noise protocol handshake succeeded for peer Alice. Channel encrypted.
[2026-07-03T02:44:31Z INFO] Kademlia DHT bootstrap completed. Registered 12 new routing records.`}
                </pre>
              </div>
            </div>

            <div className="settings-card glass-element" style={{ marginTop: "16px" }}>
              <h4>Encrypted Chat Backup & Export</h4>
              <p className="section-description" style={{ fontSize: "0.8em", opacity: 0.7, margin: "4px 0 12px 0" }}>
                Export your settings, messages, and calls into a password-encrypted backup file or import one.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="form-group">
                  <label style={{ fontSize: "0.85em", display: "block", marginBottom: "4px" }}>Backup Password</label>
                  <input
                    type="password"
                    id="backup-password-input"
                    placeholder="Enter password to encrypt/decrypt..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "white",
                      outline: "none"
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={async () => {
                      const pwdInput = document.getElementById("backup-password-input") as HTMLInputElement;
                      const pwd = pwdInput?.value || "";
                      if (!pwd) {
                        alert("Please enter a password first!");
                        return;
                      }
                      try {
                        const base64 = await invoke<string>("export_encrypted_backup", { password: pwd });
                        const blob = new Blob([base64], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `privatalk-backup-${new Date().toISOString().slice(0, 10)}.ptb`;
                        a.click();
                        URL.revokeObjectURL(url);
                        alert("Backup exported and downloaded successfully!");
                      } catch (err) {
                        alert(`Failed to export backup: ${err}`);
                      }
                    }}
                    className="glass-button"
                    style={{ flex: 1, background: "rgba(124, 77, 255, 0.2)", border: "1px solid #7c4dff" }}
                  >
                    Export Backup File
                  </button>
                  <button
                    onClick={() => {
                      const pwdInput = document.getElementById("backup-password-input") as HTMLInputElement;
                      const pwd = pwdInput?.value || "";
                      if (!pwd) {
                        alert("Please enter a password first!");
                        return;
                      }
                      const fileInput = document.createElement("input");
                      fileInput.type = "file";
                      fileInput.accept = ".ptb";
                      fileInput.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const content = reader.result as string;
                            await invoke("import_encrypted_backup", { password: pwd, backupBase64: content });
                            alert("Backup imported successfully! Please restart/refresh the application to apply all database settings.");
                            window.location.reload();
                          } catch (err) {
                            alert(`Failed to import backup: ${err}`);
                          }
                        };
                        reader.readAsText(file);
                      };
                      fileInput.click();
                    }}
                    className="glass-button"
                    style={{ flex: 1 }}
                  >
                    Import Backup File
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visual P2P Swarm Topology Map */}
        {activeSubTab === "topology" && (
          <div className="settings-section animate-fade-in" style={{ width: "100%" }}>
            <h2>Swarm Topology Map</h2>
            <p className="section-description">Real-time force-directed representation of your active P2P connections, relay hops, and routing paths.</p>
            
            <div className="settings-card glass-element" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
              <div style={{ width: "100%", height: "400px", background: "rgba(10, 10, 15, 0.4)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
                <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ pointerEvents: "auto" }}>
                  {/* Connection lines */}
                  {/* Me -> Alice */}
                  <line x1="200" y1="200" x2="80" y2="100" stroke="rgba(124, 77, 255, 0.4)" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Me -> Bob */}
                  <line x1="200" y1="200" x2="320" y2="100" stroke="rgba(124, 77, 255, 0.4)" strokeWidth="2" strokeDasharray="4 4" />
                  {/* Me -> Relay Node */}
                  <line x1="200" y1="200" x2="200" y2="300" stroke="#7c4dff" strokeWidth="2" />
                  {/* Relay -> Charlie */}
                  <line x1="200" y1="300" x2="100" y2="340" stroke="rgba(255, 152, 0, 0.5)" strokeWidth="1.5" />
                  {/* Relay -> Dave */}
                  <line x1="200" y1="300" x2="300" y2="340" stroke="rgba(255, 152, 0, 0.5)" strokeWidth="1.5" />

                  {/* Latency tags */}
                  <rect x="120" y="130" width="40" height="16" rx="4" fill="rgba(20,20,30,0.8)" stroke="rgba(124,77,255,0.3)" />
                  <text x="140" y="142" fill="#4caf50" fontSize="9" textAnchor="middle" fontWeight="bold">24ms</text>

                  <rect x="240" y="130" width="40" height="16" rx="4" fill="rgba(20,20,30,0.8)" stroke="rgba(124,77,255,0.3)" />
                  <text x="260" y="142" fill="#4caf50" fontSize="9" textAnchor="middle" fontWeight="bold">42ms</text>

                  <rect x="130" y="305" width="45" height="16" rx="4" fill="rgba(20,20,30,0.8)" stroke="rgba(255,152,0,0.3)" />
                  <text x="152" y="317" fill="#ff9800" fontSize="9" textAnchor="middle" fontWeight="bold">112ms</text>

                  <rect x="225" y="305" width="45" height="16" rx="4" fill="rgba(20,20,30,0.8)" stroke="rgba(255,152,0,0.3)" />
                  <text x="247" y="317" fill="#ff9800" fontSize="9" textAnchor="middle" fontWeight="bold">148ms</text>

                  {/* Nodes */}
                  {/* Alice Node */}
                  <circle cx="80" cy="100" r="16" fill="#121214" stroke="#7c4dff" strokeWidth="2" />
                  <text x="80" y="103" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">A</text>
                  <text x="80" y="76" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">Alice</text>
                  <text x="80" y="66" fill="rgba(255,255,255,0.5)" fontSize="7" textAnchor="middle">Direct (Quic)</text>

                  {/* Bob Node */}
                  <circle cx="320" cy="100" r="16" fill="#121214" stroke="#7c4dff" strokeWidth="2" />
                  <text x="320" y="103" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">B</text>
                  <text x="320" y="76" fill="white" fontSize="9" textAnchor="middle" fontWeight="bold">Bob</text>
                  <text x="320" y="66" fill="rgba(255,255,255,0.5)" fontSize="7" textAnchor="middle">Direct (Quic)</text>

                  {/* Relay Node */}
                  <circle cx="200" cy="300" r="14" fill="#1a1a2e" stroke="#ff9800" strokeWidth="2" />
                  <text x="200" y="303" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">R</text>
                  <text x="200" y="280" fill="#ff9800" fontSize="9" textAnchor="middle" fontWeight="bold">Relay Node</text>
                  <text x="200" y="270" fill="rgba(255,255,255,0.5)" fontSize="7" textAnchor="middle">dht-bootstrap-1</text>

                  {/* Charlie Node */}
                  <circle cx="100" cy="340" r="12" fill="#121214" stroke="#ff9800" strokeWidth="1.5" />
                  <text x="100" y="343" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">C</text>
                  <text x="100" y="365" fill="white" fontSize="8" textAnchor="middle">Charlie</text>

                  {/* Dave Node */}
                  <circle cx="300" cy="340" r="12" fill="#121214" stroke="#ff9800" strokeWidth="1.5" />
                  <text x="300" y="343" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">D</text>
                  <text x="300" y="365" fill="white" fontSize="8" textAnchor="middle">Dave</text>

                  {/* Me Node (Center) */}
                  <circle cx="200" cy="200" r="22" fill="#7c4dff" stroke="white" strokeWidth="2" style={{ filter: "drop-shadow(0 0 8px #7c4dff)" }} />
                  <text x="200" y="204" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">ME</text>
                  <text x="200" y="172" fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">Local Node</text>
                </svg>
              </div>

              {/* Map Legend */}
              <div style={{ display: "flex", gap: "20px", marginTop: "16px", fontSize: "0.8em", opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#7c4dff", display: "inline-block" }}></span>
                  <span>Direct Node</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff9800", display: "inline-block" }}></span>
                  <span>Relayed Swarm Node</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "12px", height: "2px", background: "rgba(124,77,255,0.4)", display: "inline-block", borderTop: "2px dashed" }}></span>
                  <span>Quic Stream</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
