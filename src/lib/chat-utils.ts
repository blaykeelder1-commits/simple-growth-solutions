/**
 * Safely formats markdown text into structured segments for rendering.
 * Returns an array of typed segments instead of raw HTML to avoid XSS.
 */

export type MarkdownSegment =
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "list"; items: InlineSegment[][] }
  | { type: "paragraph"; content: InlineSegment[] };

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string };

/**
 * Parse inline formatting (bold) from a text string.
 */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "bold", text: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", text }];
}

/**
 * Parse markdown text into structured segments for safe rendering.
 */
export function parseMarkdown(text: string): MarkdownSegment[] {
  if (!text) return [];
  const lines = text.split("\n");
  const segments: MarkdownSegment[] = [];
  let currentListItems: InlineSegment[][] = [];

  function flushList() {
    if (currentListItems.length > 0) {
      segments.push({ type: "list", items: currentListItems });
      currentListItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      segments.push({ type: "heading", level: 4, text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      segments.push({ type: "heading", level: 3, text: trimmed.slice(3) });
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentListItems.push(parseInline(trimmed.slice(2)));
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      currentListItems.push(parseInline(trimmed.replace(/^\d+\.\s/, "")));
      continue;
    }

    // Empty lines
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    segments.push({ type: "paragraph", content: parseInline(trimmed) });
  }

  flushList();
  return segments;
}
