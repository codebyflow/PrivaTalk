import React, { useState, useEffect } from "react";
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
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "appearance" | "p2p" | "security">("profile");
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
          </div>
        )}
      </div>
    </div>
  );
};
