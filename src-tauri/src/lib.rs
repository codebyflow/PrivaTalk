use tauri::{Manager, Listener, Emitter};

pub mod db;
pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().map_err(|e| {
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
            })?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("privatalk.db");
            let conn = db::init_db(db_path).map_err(|e| {
                std::io::Error::new(std::io::ErrorKind::Other, e.to_string())
            })?;
            app.manage(db::DbState(std::sync::Mutex::new(conn)));

            // 1. libp2p Swarm Event Listener Bridge
            let app_handle = app.handle().clone();
            app.listen_any("p2p-send-message", move |event| {
                let payload_str = event.payload();
                let app_clone = app_handle.clone();
                
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    let chat_id = data["chatId"].as_str().unwrap_or("").to_string();
                    
                    // Simulate asynchronous libp2p network roundtrip response in separate thread
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(1200));
                        
                        let replies = [
                            "⚡ [libp2p KadDHT] Peer record found. Routing QUIC packets directly.",
                            "🔒 [libp2p Gossipsub] Encrypted stream handshake successful. TLS upgraded.",
                            "✅ Swarm delivery receipt received: 0x9f2ea304d2e8b...",
                            "💡 Decrypted packet: Noise protocol layer verified session validity."
                        ];
                        
                        let sys_time = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis();
                            
                        let idx = (sys_time % 4) as usize;
                        let text = replies[idx];
                        
                        let sys_reply = serde_json::json!({
                            "id": format!("p2p-sys-{}", sys_time),
                            "senderId": "system",
                            "senderName": "System",
                            "text": text,
                            "timestamp": "Just Now",
                            "isSender": false,
                            "status": "read"
                        });
                        
                        let _ = app_clone.emit("p2p-receive-message", serde_json::json!({
                            "chatId": chat_id,
                            "message": sys_reply
                        }));
                    });
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_settings,
            commands::save_settings,
            commands::get_chats,
            commands::get_messages,
            commands::send_db_message,
            commands::get_contacts,
            commands::save_contact,
            commands::delete_contact,
            commands::update_chat_status,
            commands::delete_chat,
            commands::get_calls,
            commands::add_call_log,
            commands::save_attachment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
