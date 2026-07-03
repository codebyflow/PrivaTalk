import React, { useState } from "react";
import { Phone, Video, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search } from "lucide-react";
import { Call } from "../types";

interface CallsViewProps {
  calls: Call[];
  onStartCall: (name: string, type: "audio" | "video") => void;
}

export const CallsView: React.FC<CallsViewProps> = ({ calls, onStartCall }) => {
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCalls = calls
    .filter((call) => (filter === "all" ? true : call.direction === "missed"))
    .filter((call) => call.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getDirectionIcon = (direction: "incoming" | "outgoing" | "missed") => {
    switch (direction) {
      case "incoming":
        return <PhoneIncoming size={16} className="call-dir-incoming" />;
      case "outgoing":
        return <PhoneOutgoing size={16} className="call-dir-outgoing" />;
      case "missed":
        return <PhoneMissed size={16} className="call-dir-missed" />;
    }
  };

  return (
    <div className="calls-view-container glass-panel animate-fade-in">
      <div className="view-header">
        <div className="header-title-row">
          <h2>Call History</h2>
        </div>

        <div className="calls-controls">
          <div className="filter-pill-selector glass-element">
            <button
              onClick={() => setFilter("all")}
              className={`filter-pill ${filter === "all" ? "active" : ""}`}
            >
              All Calls
            </button>
            <button
              onClick={() => setFilter("missed")}
              className={`filter-pill ${filter === "missed" ? "active" : ""}`}
            >
              Missed
            </button>
          </div>

          <div className="search-bar-wrapper glass-element">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search call logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="calls-list">
        {filteredCalls.length === 0 ? (
          <div className="no-calls">
            <PhoneCall size={32} className="no-calls-icon" />
            <p>No call logs found.</p>
          </div>
        ) : (
          filteredCalls.map((call) => (
            <div key={call.id} className="call-item glass-card-hover">
              <div className="call-item-left">
                <div
                  className="call-avatar"
                  style={{ background: call.avatarColor }}
                >
                  {call.avatar}
                </div>
                <div className="call-meta">
                  <h3>{call.name}</h3>
                  <div className="call-direction-row">
                    {getDirectionIcon(call.direction)}
                    <span className="call-type-label">
                      {call.direction.charAt(0).toUpperCase() + call.direction.slice(1)} • {call.type} Call
                    </span>
                  </div>
                </div>
              </div>

              <div className="call-item-right">
                <div className="call-timing">
                  <span className="call-time">{call.timestamp}</span>
                  {call.duration && <span className="call-duration">{call.duration}</span>}
                </div>
                <div className="call-actions">
                  <button
                    onClick={() => onStartCall(call.name, call.type)}
                    className="call-action-btn glass-button-round"
                    title={`Call ${call.name}`}
                  >
                    {call.type === "video" ? <Video size={16} /> : <Phone size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
