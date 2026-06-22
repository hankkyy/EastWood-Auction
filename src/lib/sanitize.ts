/**
 * HTML sanitizer for eBay and other external content.
 * Strips dangerous tags, inline styles, and layout-breaking elements
 * that can escape our page container and wreck the layout.
 */

// Tags to remove entirely (including their content)
const STRIP_TAGS = new Set([
  "script", "iframe", "object", "embed", "form", "input",
  "link", "meta", "base", "applet", "frame", "frameset",
  // Style tags inject CSS that breaks layout
  "style",
  // Audio/video embeds from eBay
  "audio", "video",
]);

// Tags to unwrap (remove the tag, keep its inner content)
const UNWRAP_TAGS = new Set([
  "font", "center",
]);

// Attributes to remove (event handlers, inline styles, dangerous URLs)
const STRIP_ATTRS = /on\w+\s*=|href\s*=\s*"javascript:/gi;
// Inline style attribute — eBay descriptions are full of position:absolute, width:800px, etc.
const STRIP_STYLE = /\s*style\s*=\s*"[^"]*"/gi;
const STRIP_STYLE_SINGLE = /\s*style\s*=\s*'[^']*'/gi;

// HTML comments (may contain conditional comments)
const STRIP_COMMENTS = /<!--[\s\S]*?-->/g;

export function sanitizeHtml(html: string): string {
  if (!html) return "";

  let sanitized = html;

  // 1. Remove HTML comments
  sanitized = sanitized.replace(STRIP_COMMENTS, "");

  // 2. Remove inline styles (layout-breaking fixed widths, absolute positioning, etc.)
  sanitized = sanitized.replace(STRIP_STYLE, "");
  sanitized = sanitized.replace(STRIP_STYLE_SINGLE, "");

  // 3. Remove event handlers and javascript: URLs
  sanitized = sanitized.replace(STRIP_ATTRS, "");

  // 4. Remove dangerous tags with their content
  for (const tag of STRIP_TAGS) {
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
      ""
    );
    // Self-closing form
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*\\/>`, "gi"),
      ""
    );
  }

  // 5. Unwrap font/center tags (keep inner content, remove the wrapper)
  for (const tag of UNWRAP_TAGS) {
    sanitized = sanitized.replace(
      new RegExp(`<\\/${tag}\\s*>`, "gi"),
      ""
    );
    sanitized = sanitized.replace(
      new RegExp(`<${tag}\\b[^>]*>`, "gi"),
      ""
    );
  }

  // 6. Tables: eBay descriptions often have tables with fixed widths (e.g. width="800").
  //    Strip width/height attributes from tables to prevent overflow.
  sanitized = sanitized.replace(
    /<table\b([^>]*)>/gi,
    (_, attrs) => {
      const cleaned = attrs
        .replace(/\s*width\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*width\s*=\s*'[^']*'/gi, "")
        .replace(/\s*height\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*height\s*=\s*'[^']*'/gi, "")
        .replace(/\s*bgcolor\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*bgcolor\s*=\s*'[^']*'/gi, "");
      return `<table${cleaned}>`;
    }
  );

  // 7. Strip width/height from td/th as well
  sanitized = sanitized.replace(
    /<(td|th)\b([^>]*)>/gi,
    (_, tag, attrs) => {
      const cleaned = attrs
        .replace(/\s*width\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*width\s*=\s*'[^']*'/gi, "")
        .replace(/\s*height\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*height\s*=\s*'[^']*'/gi, "");
      return `<${tag}${cleaned}>`;
    }
  );

  // 8. Strip width/height from img (CSS will constrain via max-width)
  sanitized = sanitized.replace(
    /<img\b([^>]*)>/gi,
    (_, attrs) => {
      const cleaned = attrs
        .replace(/\s*width\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*width\s*=\s*'[^']*'/gi, "")
        .replace(/\s*height\s*=\s*"[^"]*"/gi, "")
        .replace(/\s*height\s*=\s*'[^']*'/gi, "");
      return `<img${cleaned}>`;
    }
  );

  return sanitized;
}
