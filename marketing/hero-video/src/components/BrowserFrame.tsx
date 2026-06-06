import React from "react";
import { COLORS, FONT } from "../theme";

// A sleek browser window used for site reveals. Glassy dark chrome, brand-lit
// border. `children` fills the viewport area.
export const BrowserFrame: React.FC<{
  width: number;
  domain: string;
  children: React.ReactNode;
  glow?: number;
}> = ({ width, domain, children, glow = 1 }) => {
  const height = width * 0.62;
  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${60 * glow}px rgba(99,102,241,${0.35 * glow})`,
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Chrome bar */}
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 18px",
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 99, background: "#ff5f57" }} />
        <span style={{ width: 12, height: 12, borderRadius: 99, background: "#febc2e" }} />
        <span style={{ width: 12, height: 12, borderRadius: 99, background: "#28c840" }} />
        <div
          style={{
            marginLeft: 14,
            flex: 1,
            maxWidth: 360,
            height: 24,
            borderRadius: 99,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.muted,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {domain}
        </div>
      </div>
      {/* Viewport */}
      <div style={{ height, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
};
