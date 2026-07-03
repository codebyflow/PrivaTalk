import React from "react";
import { MessageSquare, Users, Phone, Settings, Moon, Sun } from "lucide-react";

interface SidebarProps {
  activeTab: "chats" | "contacts" | "calls" | "settings";
  setActiveTab: (tab: "chats" | "contacts" | "calls" | "settings") => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onProfileClick: () => void;
  profileAvatar?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  theme,
  toggleTheme,
  onProfileClick,
  profileAvatar,
}) => {

  return (
    <aside className="sidebar-container glass-panel">

      {/* Middle Section: Nav Items */}
      <nav className="sidebar-nav">
        <button
          onClick={() => setActiveTab("chats")}
          className={`sidebar-nav-btn ${activeTab === "chats" ? "active" : ""}`}
          title="Chats"
        >
          <div className="nav-btn-icon-wrapper">
            <MessageSquare size={20} />
          </div>
          <span className="nav-btn-text">Chats</span>
          <span className="nav-badge-dot"></span>
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`sidebar-nav-btn ${activeTab === "contacts" ? "active" : ""}`}
          title="Contacts"
        >
          <div className="nav-btn-icon-wrapper">
            <Users size={20} />
          </div>
          <span className="nav-btn-text">Contacts</span>
        </button>

        <button
          onClick={() => setActiveTab("calls")}
          className={`sidebar-nav-btn ${activeTab === "calls" ? "active" : ""}`}
          title="Calls"
        >
          <div className="nav-btn-icon-wrapper">
            <Phone size={20} />
          </div>
          <span className="nav-btn-text">Calls</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`sidebar-nav-btn ${activeTab === "settings" ? "active" : ""}`}
          title="Settings"
        >
          <div className="nav-btn-icon-wrapper">
            <Settings size={20} />
          </div>
          <span className="nav-btn-text">Settings</span>
        </button>
      </nav>

      {/* Bottom Section: Theme Toggle, Profile */}
      <div className="sidebar-bottom">
        <button
          onClick={toggleTheme}
          className="sidebar-theme-toggle glass-button-round"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="sidebar-profile" onClick={onProfileClick} title="View Profile & QR-Code" style={{ cursor: "pointer" }}>
          <div className="profile-avatar">
            {profileAvatar ? <img src={profileAvatar} className="sidebar-avatar-img" alt="Profile" /> : "ME"}
          </div>
        </div>
      </div>
    </aside>
  );
};
