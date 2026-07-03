use crate::db::{AppSettings, Attachment, Call, Chat, Contact, Message, DbState};
use rusqlite::{params, OptionalExtension};
use tauri::State;

#[tauri::command]
pub fn load_settings(state: State<'_, DbState>) -> Result<AppSettings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT profile_name, profile_status, glass_opacity, glass_blur, bg_theme, p2p_transport, enable_mdns, enable_dht, enable_relay, bind_address, profile_avatar FROM settings WHERE id = 1")
        .map_err(|e| e.to_string())?;
    
    let settings = stmt
        .query_row([], |row| {
            Ok(AppSettings {
                profile_name: row.get(0)?,
                profile_status: row.get(1)?,
                glass_opacity: row.get(2)?,
                glass_blur: row.get(3)?,
                bg_theme: row.get(4)?,
                p2p_transport: row.get(5)?,
                enable_mdns: row.get::<_, i32>(6)? != 0,
                enable_dht: row.get::<_, i32>(7)? != 0,
                enable_relay: row.get::<_, i32>(8)? != 0,
                bind_address: row.get(9)?,
                profile_avatar: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
        
    Ok(settings)
}

#[tauri::command]
pub fn save_settings(settings: AppSettings, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE settings SET 
            profile_name = ?1, 
            profile_status = ?2, 
            glass_opacity = ?3, 
            glass_blur = ?4, 
            bg_theme = ?5, 
            p2p_transport = ?6, 
            enable_mdns = ?7, 
            enable_dht = ?8, 
            enable_relay = ?9, 
            bind_address = ?10, 
            profile_avatar = ?11 
         WHERE id = 1",
        params![
            settings.profile_name,
            settings.profile_status,
            settings.glass_opacity,
            settings.glass_blur,
            settings.bg_theme,
            settings.p2p_transport,
            if settings.enable_mdns { 1 } else { 0 },
            if settings.enable_dht { 1 } else { 0 },
            if settings.enable_relay { 1 } else { 0 },
            settings.bind_address,
            settings.profile_avatar,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_chats(state: State<'_, DbState>) -> Result<Vec<Chat>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, avatar, avatar_color, status, unread_count, peer_id, is_pinned, is_muted, is_archived, is_blocked FROM chats")
        .map_err(|e| e.to_string())?;
        
    let chat_rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i32>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i32>(7)? != 0,
                row.get::<_, i32>(8)? != 0,
                row.get::<_, i32>(9)? != 0,
                row.get::<_, i32>(10)? != 0,
            ))
        })
        .map_err(|e| e.to_string())?;
        
    let mut chats = Vec::new();
    for row in chat_rows {
        let (id, name, avatar, avatar_color, status, unread_count, peer_id, is_pinned, is_muted, is_archived, is_blocked) = row.map_err(|e| e.to_string())?;
        
        // Fetch messages for this chat
        let mut msg_stmt = conn
            .prepare("SELECT id, sender_id, sender_name, text, timestamp, is_sender, status, attachment_name, attachment_type, attachment_url FROM messages WHERE chat_id = ?1 ORDER BY rowid ASC")
            .map_err(|e| e.to_string())?;
            
        let msg_rows = msg_stmt
            .query_map(params![id], |m_row| {
                let attachment_name: Option<String> = m_row.get(7)?;
                let attachment_type: Option<String> = m_row.get(8)?;
                let attachment_url: Option<String> = m_row.get(9)?;
                
                let attachment = if let (Some(name), Some(r#type)) = (attachment_name, attachment_type) {
                    Some(Attachment { name, r#type, url: attachment_url })
                } else {
                    None
                };
                
                Ok(Message {
                    id: m_row.get(0)?,
                    sender_id: m_row.get(1)?,
                    sender_name: m_row.get(2)?,
                    text: m_row.get(3)?,
                    timestamp: m_row.get(4)?,
                    is_sender: m_row.get::<_, i32>(5)? != 0,
                    status: m_row.get(6)?,
                    attachment,
                })
            })
            .map_err(|e| e.to_string())?;
            
        let mut messages = Vec::new();
        for msg in msg_rows {
            messages.push(msg.map_err(|e| e.to_string())?);
        }
        
        chats.push(Chat {
            id,
            name,
            avatar,
            avatar_color,
            status,
            unread_count,
            peer_id,
            is_pinned,
            is_muted,
            is_archived,
            is_blocked,
            messages,
        });
    }
    
    Ok(chats)
}

#[tauri::command]
pub fn get_messages(chat_id: String, state: State<'_, DbState>) -> Result<Vec<Message>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, sender_id, sender_name, text, timestamp, is_sender, status, attachment_name, attachment_type, attachment_url FROM messages WHERE chat_id = ?1 ORDER BY rowid ASC")
        .map_err(|e| e.to_string())?;
        
    let msg_rows = stmt
        .query_map(params![chat_id], |row| {
            let attachment_name: Option<String> = row.get(7)?;
            let attachment_type: Option<String> = row.get(8)?;
            let attachment_url: Option<String> = row.get(9)?;
            
            let attachment = if let (Some(name), Some(r#type)) = (attachment_name, attachment_type) {
                Some(Attachment { name, r#type, url: attachment_url })
            } else {
                None
            };
            
            Ok(Message {
                id: row.get(0)?,
                sender_id: row.get(1)?,
                sender_name: row.get(2)?,
                text: row.get(3)?,
                timestamp: row.get(4)?,
                is_sender: row.get::<_, i32>(5)? != 0,
                status: row.get(6)?,
                attachment,
            })
        })
        .map_err(|e| e.to_string())?;
        
    let mut messages = Vec::new();
    for msg in msg_rows {
        messages.push(msg.map_err(|e| e.to_string())?);
    }
    
    Ok(messages)
}

#[tauri::command]
pub fn send_db_message(
    chat_id: String,
    message: Message,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // First check if chat exists, if not create a default one
    let chat_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM chats WHERE id = ?1",
            params![chat_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
        
    if chat_exists == 0 {
        // Find matching contact for info
        let contact_info: Option<(String, String, String)> = conn
            .query_row(
                "SELECT name, avatar, avatar_color FROM contacts WHERE peer_id = ?1",
                params![chat_id], // assuming chat_id is peer_id or contact_id
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()
            .map_err(|e| e.to_string())?;
            
        let (name, avatar, avatar_color) = contact_info.unwrap_or_else(|| {
            (
                message.sender_name.clone(),
                message.sender_name.chars().next().unwrap_or('P').to_string(),
                "#4f46e5".to_string(),
            )
        });
        
        conn.execute(
            "INSERT INTO chats (id, name, avatar, avatar_color, status, unread_count, peer_id, is_pinned, is_muted, is_archived, is_blocked) 
             VALUES (?1, ?2, ?3, ?4, 'offline', 0, ?1, 0, 0, 0, 0)",
            params![chat_id, name, avatar, avatar_color],
        )
        .map_err(|e| e.to_string())?;
    }

    let (attachment_name, attachment_type, attachment_url) = if let Some(ref att) = message.attachment {
        (Some(att.name.clone()), Some(att.r#type.clone()), att.url.clone())
    } else {
        (None, None, None)
    };
    
    conn.execute(
        "INSERT INTO messages (id, chat_id, sender_id, sender_name, text, timestamp, is_sender, status, attachment_name, attachment_type, attachment_url) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            message.id,
            chat_id,
            message.sender_id,
            message.sender_name,
            message.text,
            message.timestamp,
            if message.is_sender { 1 } else { 0 },
            message.status,
            attachment_name,
            attachment_type,
            attachment_url,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn get_contacts(state: State<'_, DbState>) -> Result<Vec<Contact>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, avatar, avatar_color, status, status_message, peer_id, is_muted, is_blocked FROM contacts")
        .map_err(|e| e.to_string())?;
        
    let rows = stmt
        .query_map([], |row| {
            Ok(Contact {
                id: row.get(0)?,
                name: row.get(1)?,
                avatar: row.get(2)?,
                avatar_color: row.get(3)?,
                status: row.get(4)?,
                status_message: row.get(5)?,
                peer_id: row.get(6)?,
                is_muted: row.get::<_, i32>(7)? != 0,
                is_blocked: row.get::<_, i32>(8)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
        
    let mut contacts = Vec::new();
    for r in rows {
        contacts.push(r.map_err(|e| e.to_string())?);
    }
    
    Ok(contacts)
}

#[tauri::command]
pub fn save_contact(contact: Contact, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO contacts (id, name, avatar, avatar_color, status, status_message, peer_id, is_muted, is_blocked) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            contact.id,
            contact.name,
            contact.avatar,
            contact.avatar_color,
            contact.status,
            contact.status_message,
            contact.peer_id,
            if contact.is_muted { 1 } else { 0 },
            if contact.is_blocked { 1 } else { 0 },
        ],
    )
    .map_err(|e| e.to_string())?;
    
    // Check if a chat card should be updated with mute/block state as well
    conn.execute(
        "UPDATE chats SET is_muted = ?1, is_blocked = ?2 WHERE peer_id = ?3",
        params![
            if contact.is_muted { 1 } else { 0 },
            if contact.is_blocked { 1 } else { 0 },
            contact.peer_id,
        ],
    ).ok();
    
    Ok(())
}

#[tauri::command]
pub fn delete_contact(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM contacts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_chat_status(
    id: String,
    field: String,
    value: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let int_val = if value { 1 } else { 0 };
    
    match field.as_str() {
        "isPinned" => {
            conn.execute("UPDATE chats SET is_pinned = ?1 WHERE id = ?2", params![int_val, id])
                .map_err(|e| e.to_string())?;
        }
        "isMuted" => {
            conn.execute("UPDATE chats SET is_muted = ?1 WHERE id = ?2", params![int_val, id])
                .map_err(|e| e.to_string())?;
            // Sync back to contact
            let peer_id: Option<String> = conn
                .query_row("SELECT peer_id FROM chats WHERE id = ?1", params![id], |row| row.get(0))
                .optional()
                .map_err(|e| e.to_string())?;
            if let Some(pid) = peer_id {
                conn.execute("UPDATE contacts SET is_muted = ?1 WHERE peer_id = ?2", params![int_val, pid]).ok();
            }
        }
        "isArchived" => {
            conn.execute("UPDATE chats SET is_archived = ?1 WHERE id = ?2", params![int_val, id])
                .map_err(|e| e.to_string())?;
        }
        "isBlocked" => {
            conn.execute("UPDATE chats SET is_blocked = ?1 WHERE id = ?2", params![int_val, id])
                .map_err(|e| e.to_string())?;
            // Sync back to contact
            let peer_id: Option<String> = conn
                .query_row("SELECT peer_id FROM chats WHERE id = ?1", params![id], |row| row.get(0))
                .optional()
                .map_err(|e| e.to_string())?;
            if let Some(pid) = peer_id {
                conn.execute("UPDATE contacts SET is_blocked = ?1 WHERE peer_id = ?2", params![int_val, pid]).ok();
            }
        }
        _ => return Err("Invalid field name".to_string()),
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_chat(id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // cascade delete messages is active in foreign keys, but delete manually just in case
    conn.execute("DELETE FROM messages WHERE chat_id = ?1", params![id]).ok();
    conn.execute("DELETE FROM chats WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_calls(state: State<'_, DbState>) -> Result<Vec<Call>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, avatar, avatar_color, type, direction, timestamp, duration FROM calls ORDER BY rowid DESC")
        .map_err(|e| e.to_string())?;
        
    let rows = stmt
        .query_map([], |row| {
            Ok(Call {
                id: row.get(0)?,
                name: row.get(1)?,
                avatar: row.get(2)?,
                avatar_color: row.get(3)?,
                r#type: row.get(4)?,
                direction: row.get(5)?,
                timestamp: row.get(6)?,
                duration: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
        
    let mut calls = Vec::new();
    for r in rows {
        calls.push(r.map_err(|e| e.to_string())?);
    }
    
    Ok(calls)
}

#[tauri::command]
pub fn add_call_log(call: Call, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO calls (id, name, avatar, avatar_color, type, direction, timestamp, duration) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            call.id,
            call.name,
            call.avatar,
            call.avatar_color,
            call.r#type,
            call.direction,
            call.timestamp,
            call.duration,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn save_attachment(
    app: tauri::AppHandle,
    name: String,
    base64_data: String,
) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    use tauri::Manager;

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let attachments_dir = app_data_dir.join("attachments");
    std::fs::create_dir_all(&attachments_dir).map_err(|e| e.to_string())?;

    let clean_base64 = if let Some(pos) = base64_data.find(",") {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = general_purpose::STANDARD
        .decode(clean_base64)
        .map_err(|e| e.to_string())?;

    let file_path = attachments_dir.join(&name);
    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}
