"use client";

import { parseMarkdown, type InlineSegment } from "@/lib/chat-utils";

function InlineContent({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "bold" ? (
          <strong key={i}>{seg.text}</strong>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function SafeMarkdown({ content }: { content: string }) {
  const segments = parseMarkdown(content);

  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "heading":
            return seg.level === 3 ? (
              <h3 key={i} className="font-semibold text-gray-900 mt-3 mb-1">
                {seg.text}
              </h3>
            ) : (
              <h4 key={i} className="font-medium text-gray-800 mt-2 mb-1">
                {seg.text}
              </h4>
            );
          case "list":
            return (
              <ul key={i} className="list-disc pl-4 my-2">
                {seg.items.map((item, j) => (
                  <li key={j}>
                    <InlineContent segments={item} />
                  </li>
                ))}
              </ul>
            );
          case "paragraph":
            return (
              <p key={i}>
                <InlineContent segments={seg.content} />
              </p>
            );
        }
      })}
    </>
  );
}
