import React, { useState } from "react";
import { Search, UserPlus, MessageSquare, Phone, Shield, Copy, Check, Volume2, VolumeX, ShieldAlert, Trash2 } from "lucide-react";
import { Contact } from "../types";

interface ContactsViewProps {
  contacts: Contact[];
  onStartChat: (contactName: string, peerId: string) => void;
  onAddContact: (name: string, peerId: string) => void;
  onDeleteContact: (contactId: string) => void;
  onMuteContact: (contactId: string) => void;
  onBlockContact: (contactId: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onStartChat,
  onAddContact,
  onDeleteContact,
  onMuteContact,
  onBlockContact,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPeerId, setNewContactPeerId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.peerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (peerId: string) => {
    navigator.clipboard.writeText(peerId);
    setCopiedId(peerId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactName.trim() && newContactPeerId.trim()) {
      onAddContact(newContactName.trim(), newContactPeerId.trim());
      setNewContactName("");
      setNewContactPeerId("");
      setShowAddContact(false);
    }
  };

  return (
    <div className="contacts-view-container glass-panel animate-fade-in">
      <div className="view-header">
        <div className="header-title-row">
          <h2>Peer Directory</h2>
          <button
            onClick={() => setShowAddContact(!showAddContact)}
            className={`add-contact-trigger ${showAddContact ? "active" : ""}`}
            title="Add contact"
          >
            <UserPlus size={18} />
          </button>
        </div>

        {showAddContact && (
          <form onSubmit={handleSubmit} className="add-contact-form glass-element animate-slide-down">
            <h4>Add New Peer Link</h4>
            <div className="form-group">
              <input
                type="text"
                placeholder="Alias (e.g. Eve)"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                required
                className="glass-input"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Peer ID (e.g. 12D3KooW...)"
                value={newContactPeerId}
                onChange={(e) => setNewContactPeerId(e.target.value)}
                required
                className="glass-input"
              />
            </div>
            <button type="submit" className="glass-button-primary">
              Save Peer
            </button>
          </form>
        )}

        <div className="search-bar-wrapper glass-element">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="contacts-list">
        {filteredContacts.length === 0 ? (
          <div className="no-contacts">
            <Shield size={32} className="no-contacts-icon" />
            <p>No peers found matching query.</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div key={contact.id} className="contact-card glass-card">
              <div className="contact-card-header">
                <div className="contact-avatar-wrapper">
                  <div
                    className="contact-avatar"
                    style={{ background: contact.avatarColor }}
                  >
                    {contact.avatar}
                  </div>
                  <span className={`status-dot ${contact.status}`}></span>
                  {contact.isBlocked && (
                    <span className="blocked-badge" title="Peer Blocked">
                      <ShieldAlert size={10} />
                    </span>
                  )}
                </div>
                <div className="contact-meta">
                  <h3 className={contact.isBlocked ? "blocked-peer-name" : ""}>{contact.name}</h3>
                  <span className="contact-status-msg">
                    {contact.isBlocked ? (
                      <span className="blocked-text">🔒 Blocked</span>
                    ) : (
                      contact.statusMessage
                    )}
                    {contact.isMuted && (
                      <VolumeX size={12} className="mute-icon" style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle" }} />
                    )}
                  </span>
                </div>
              </div>

              <div className="contact-card-body">
                <div className="peer-key-display glass-element">
                  <span className="key-label">Public Key (Ed25519)</span>
                  <div className="key-value-row">
                    <code>{contact.peerId}</code>
                    <button onClick={() => handleCopy(contact.peerId)} className="copy-btn">
                      {copiedId === contact.peerId ? (
                        <Check size={14} className="copied" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="contact-card-actions">
                <button
                  onClick={() => onStartChat(contact.name, contact.peerId)}
                  className="contact-action-btn glass-button-primary"
                  disabled={contact.isBlocked}
                >
                  <MessageSquare size={16} />
                  <span>Message</span>
                </button>
                <button className="contact-action-btn glass-button" disabled={contact.isBlocked}>
                  <Phone size={16} />
                  <span>Call</span>
                </button>
                
                {/* Custom contact actions */}
                <button
                  onClick={() => onMuteContact(contact.id)}
                  className={`glass-button-round ${contact.isMuted ? "active" : ""}`}
                  title={contact.isMuted ? "Unmute Contact" : "Mute Contact"}
                >
                  {contact.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                
                <button
                  onClick={() => onBlockContact(contact.id)}
                  className={`glass-button-round danger-action-btn ${contact.isBlocked ? "active" : ""}`}
                  title={contact.isBlocked ? "Unblock Contact" : "Block Contact"}
                >
                  <ShieldAlert size={16} />
                </button>
                
                <button
                  onClick={() => onDeleteContact(contact.id)}
                  className="glass-button-round delete-action-btn"
                  title="Delete Contact"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
