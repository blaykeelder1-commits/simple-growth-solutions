import React from "react";
import { AbsoluteFill } from "remotion";
import { KineticText } from "../components/KineticText";
import { useLayout } from "../useLayout";

// 0–7s. The emotional open. Two thoughts, a beat apart.
export const Hook: React.FC = () => {
  const L = useLayout();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: L.pad }}>
      <div style={{ width: L.contentWidth }}>
        <KineticText
          start={6}
          fontSize={L.h1}
          lines={[[{ text: "Your" }, { text: "business" }, { text: "is" }, { text: "great." }]]}
          out={186}
        />
        <div style={{ height: L.h1 * 0.25 }} />
        <KineticText
          start={56}
          fontSize={L.h1}
          lines={[[{ text: "Your" }, { text: "website" }, { text: "should", accent: true }, { text: "be", accent: true }, { text: "too.", accent: true }]]}
          out={186}
        />
      </div>
    </AbsoluteFill>
  );
};
