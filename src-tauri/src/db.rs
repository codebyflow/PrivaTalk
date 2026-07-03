use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub struct DbState(pub std::sync::Mutex<Connection>);


#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub profile_name: String,
    pub profile_status: String,
    pub glass_opacity: f64,
    pub glass_blur: i32,
    pub bg_theme: String,
    pub p2p_transport: String,
    pub enable_mdns: bool,
    pub enable_dht: bool,
    pub enable_relay: bool,
    pub bind_address: String,
    pub profile_avatar: Option<String>,
    pub chat_wallpaper: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub avatar_color: String,
    pub status: String,
    pub status_message: String,
    pub peer_id: String,
    pub is_muted: bool,
    pub is_blocked: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplyTo {
    pub id: String,
    pub sender_name: String,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Reaction {
    pub emoji: String,
    pub count: i32,
    pub senders: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub r#type: String, // "image" | "file" | "audio"
    pub name: String,
    pub url: Option<String>,
    pub duration: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub text: String,
    pub timestamp: String,
    pub is_sender: bool,
    pub status: String,
    pub attachment: Option<Attachment>,
    pub reply_to: Option<ReplyTo>,
    pub reactions: Option<Vec<Reaction>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub avatar_color: String,
    pub status: String,
    pub unread_count: i32,
    pub peer_id: String,
    pub is_pinned: bool,
    pub is_muted: bool,
    pub is_archived: bool,
    pub is_blocked: bool,
    pub is_verified: Option<bool>,
    pub ephemeral_timer: Option<i32>,
    pub messages: Vec<Message>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Call {
    pub id: String,
    pub name: String,
    pub avatar: String,
    pub avatar_color: String,
    pub r#type: String, // "audio" | "video"
    pub direction: String, // "incoming" | "outgoing" | "missed"
    pub timestamp: String,
    pub duration: Option<String>,
}

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    // Create settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            profile_name TEXT NOT NULL,
            profile_status TEXT NOT NULL,
            glass_opacity REAL NOT NULL,
            glass_blur INTEGER NOT NULL,
            bg_theme TEXT NOT NULL,
            p2p_transport TEXT NOT NULL,
            enable_mdns INTEGER NOT NULL,
            enable_dht INTEGER NOT NULL,
            enable_relay INTEGER NOT NULL,
            bind_address TEXT NOT NULL,
            profile_avatar TEXT,
            chat_wallpaper TEXT
        )",
        [],
    )?;

    // Migration updates for existing settings tables
    let _ = conn.execute("ALTER TABLE settings ADD COLUMN chat_wallpaper TEXT", []);

    // Create contacts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            status TEXT NOT NULL,
            status_message TEXT NOT NULL,
            peer_id TEXT NOT NULL UNIQUE,
            is_muted INTEGER NOT NULL DEFAULT 0,
            is_blocked INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )?;

    // Create chats table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            status TEXT NOT NULL,
            unread_count INTEGER NOT NULL DEFAULT 0,
            peer_id TEXT NOT NULL UNIQUE,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_muted INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            is_blocked INTEGER NOT NULL DEFAULT 0,
            is_verified INTEGER NOT NULL DEFAULT 0,
            ephemeral_timer INTEGER NOT NULL DEFAULT 0
        )",
        [],
    )?;

    // Migration updates for existing databases
    let _ = conn.execute("ALTER TABLE chats ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE chats ADD COLUMN ephemeral_timer INTEGER NOT NULL DEFAULT 0", []);

    // Create messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            is_sender INTEGER NOT NULL,
            status TEXT NOT NULL,
            attachment_name TEXT,
            attachment_type TEXT,
            attachment_url TEXT,
            attachment_duration TEXT,
            reply_to TEXT,
            reactions TEXT,
            FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Migration updates for existing databases
    let _ = conn.execute("ALTER TABLE messages ADD COLUMN attachment_duration TEXT", []);
    let _ = conn.execute("ALTER TABLE messages ADD COLUMN reply_to TEXT", []);
    let _ = conn.execute("ALTER TABLE messages ADD COLUMN reactions TEXT", []);

    // Create calls table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS calls (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            type TEXT NOT NULL,
            direction TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            duration TEXT
        )",
        [],
    )?;

    // Seed default settings row if empty
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM settings WHERE id = 1",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        conn.execute(
            "INSERT INTO settings (
                id, profile_name, profile_status, glass_opacity, glass_blur, bg_theme,
                p2p_transport, enable_mdns, enable_dht, enable_relay, bind_address, profile_avatar
            ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL)",
            params![
                "Rust Dev",
                "Building P2P Networks 🦀",
                0.15,
                20,
                "neon",
                "quic",
                1, // true
                1, // true
                1, // true
                "/ip4/0.0.0.0/udp/4001/quic-v1"
            ],
        )?;
    }

    Ok(conn)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupData {
    pub settings: AppSettings,
    pub contacts: Vec<Contact>,
    pub chats: Vec<Chat>,
    pub calls: Vec<Call>,
}
