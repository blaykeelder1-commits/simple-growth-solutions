"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface CalEmbedProps {
  // Cal.com link path, e.g. "simplegrowth/30min"
  calLink: string;
  // Default height in pixels for the embed iframe.
  height?: number;
}

function CalEmbedInner({ calLink, height = 700 }: CalEmbedProps) {
  const searchParams = useSearchParams();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    // Pass through name/email/notes as Cal.com prefill query params so the
    // booking form is pre-populated. Also include leadId / websiteUrl as
    // metadata Cal.com will surface back via webhook.
    const name = searchParams.get("name") || "";
    const email = searchParams.get("email") || "";
    const notes = searchParams.get("notes") || searchParams.get("websiteUrl") || "";
    const leadId = searchParams.get("leadId") || "";

    const url = new URL(`https://cal.com/${calLink}`);
    if (name) url.searchParams.set("name", name);
    if (email) url.searchParams.set("email", email);
    if (notes) url.searchParams.set("notes", notes);
    // Cal.com supports custom metadata via the "metadata" param (JSON-encoded).
    if (leadId) {
      url.searchParams.set("metadata[leadId]", leadId);
    }
    url.searchParams.set("embed", "true");
    setSrc(url.toString());
  }, [calLink, searchParams]);

  if (!src) {
    return <div className="min-h-[500px] animate-pulse bg-gray-50" />;
  }

  return (
    <iframe
      src={src}
      style={{ width: "100%", height: `${height}px`, border: "0" }}
      loading="lazy"
      title="Book a free consultation"
    />
  );
}

export function CalEmbed(props: CalEmbedProps) {
  return (
    <Suspense fallback={<div className="min-h-[500px] animate-pulse bg-gray-50" />}>
      <CalEmbedInner {...props} />
    </Suspense>
  );
}
