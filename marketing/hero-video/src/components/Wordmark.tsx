import React from "react";
import { COLORS, FONT, ACCENT_GRADIENT } from "../theme";

// SGS wordmark — a gradient "SGS" monogram tile + the full name.
export const Wordmark: React.FC<{ size?: number; stacked?: boolean }> = ({
  size = 1,
  stacked = false,
}) => {
  const tile = 64 * size;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        gap: stacked ? 18 : 22,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: tile,
          height: tile,
          borderRadius: tile * 0.28,
          background: ACCENT_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: tile * 0.42,
          letterSpacing: "-0.04em",
          boxShadow: "0 16px 50px rgba(99,102,241,0.5)",
        }}
      >
        SGS
      </div>
      <div
        style={{
          color: COLORS.white,
          fontWeight: 700,
          fontSize: 34 * size,
          letterSpacing: "-0.02em",
          textAlign: stacked ? "center" : "left",
        }}
      >
        Simple Growth Solutions
      </div>
    </div>
  );
};
