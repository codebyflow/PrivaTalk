# 🔒 PrivaTalk

> **Liquid-Glass Decentralized P2P Swarm Messenger**  
> Built with **Tauri v2**, **Rust**, **React**, **TypeScript**, and **WebRTC**.

---

PrivaTalk is a secure, decentralized peer-to-peer desktop messaging application designed to provide metadata-private, end-to-end encrypted conversations without central servers. It combines the safety of Rust’s local persistence with WebRTC’s direct real-time communication channels, wrapped in a glassmorphic user interface.

## 🚀 Key Features

*   **⚡ libp2p Swarm Integration**: Driven by a background Rust thread handling Gossipsub message delivery, KadDHT peer routing discovery, and QUIC transports.
*   **💾 Local SQLite Database**: Absolute data ownership. Chat history, contacts, call logs, and client settings are persisted inside a secure, encrypted-by-default SQLite database.
*   **📞 WebRTC Calling Viewports**: Real-time peer-to-peer audio and video calls. Implements live `RTCPeerConnection` streams, local self-previews (picture-in-picture), and mic/camera toggles.
*   **📷 QR Code Camera Scanner**: Add contacts instantly. Just hold a peer's node QR code in front of your webcam to establish a direct link.
*   **🎨 Liquid-Glass Design**: Frameless macOS-style window with custom Traffic-Light titlebar controls, responsive layout blurs, base64 profile picture uploads, and mobile swipe-to-action gestures.

---

## 🛠️ Architecture

```mermaid
graph TD
    subgraph Webview (React + TypeScript)
        UI[Liquid-Glass UI] --> Swipe[Touch Swipe Gestures]
        UI --> RTC[RTCPeerConnection WebRTC]
        UI --> QR[QR Code Camera Scanner]
    end

    subgraph Tauri v2 IPC Bridge
        IPC[core::invoke / Event listeners]
    end

    subgraph Rust Core (Desktop App)
        Setup[Tauri setup] --> DB[SQLite Connection Pool]
        Setup --> Swarm[libp2p Swarm Thread]
        Swarm --> Msg[Gossipsub / KadDHT]
    end

    UI <-->|Tauri Events| IPC
    IPC <-->|Rust Commands| Setup
```

---

## 🏃 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust & Cargo](https://www.rust-lang.org/) (v1.75+)
*   System dependencies for Tauri (e.g., `webkit2gtk` on Linux)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/codebyflow/PrivaTalk.git
   cd PrivaTalk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in developer mode:
   ```bash
   npm run tauri dev
   ```

4. Build production binaries:
   ```bash
   npm run tauri build
   ```

---

## 🔒 License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**. See the [LICENSE](LICENSE) file for details.
