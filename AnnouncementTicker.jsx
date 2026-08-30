import { useEffect, useState } from "react";
import { getCachedConfig, getAppConfig } from "../lib/appConfig";

// Scrolling announcement bar shown at the very top of the app. Text,
// background color and on/off state are all controlled from
// Settings → App Settings → Announcement Ticker.
export default function AnnouncementTicker() {
  const [config, setConfig] = useState(getCachedConfig());

  useEffect(() => {
    getAppConfig().then(setConfig).catch(() => {});
    const refresh = (event) => setConfig(event.detail || getCachedConfig());
    window.addEventListener("appconfigchange", refresh);
    return () => window.removeEventListener("appconfigchange", refresh);
  }, []);

  if (!config.tickerEnabled || !config.tickerText?.trim()) return null;

  const bg = config.tickerBgColor || "#123b36";
  const color = config.tickerTextColor || "#ffffff";

  return (
    <div
      style={{
        background: bg,
        color,
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "8px 0",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes shophub-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
      <div
        style={{
          display: "inline-block",
          paddingLeft: "100%",
          animation: "shophub-ticker-scroll 18s linear infinite",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        {config.tickerText}
      </div>
    </div>
  );
}