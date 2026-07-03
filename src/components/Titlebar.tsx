import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const Titlebar: React.FC = () => {
  const handleMinimize = async () => {
    try {
      const window = getCurrentWindow();
      await window.minimize();
    } catch (err) {
      console.warn("Unable to minimize window:", err);
    }
  };

  const handleMaximize = async () => {
    try {
      const window = getCurrentWindow();
      await window.toggleMaximize();
    } catch (err) {
      console.warn("Unable to maximize window:", err);
    }
  };

  const handleClose = async () => {
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (err) {
      console.warn("Unable to close window:", err);
    }
  };

  return (
    <div className="custom-titlebar" data-tauri-drag-region>
      <div className="traffic-lights">
        <button
          onClick={handleClose}
          className="traffic-dot close-dot"
          title="Close"
        />
        <button
          onClick={handleMinimize}
          className="traffic-dot minimize-dot"
          title="Minimize"
        />
        <button
          onClick={handleMaximize}
          className="traffic-dot maximize-dot"
          title="Maximize"
        />
      </div>
      <span className="titlebar-title" data-tauri-drag-region>
        PrivaTalk
      </span>
      <div className="titlebar-spacer" />
    </div>
  );
};
