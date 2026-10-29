"use client";

import { useState } from "react";
import type { Pin } from "@/lib/types";

/** Full-size original, falling back to the 564px image if the original's URL guess is wrong. */
export function Photo({ pin }: { pin: Pin }) {
  const [src, setSrc] = useState(pin.original ?? pin.image);
  if (!src) return null;
  return <img src={src} alt="" onError={() => pin.image && src !== pin.image && setSrc(pin.image)} />;
}

const EMBED_WIDTH = 345;

/** Pinterest's official embed, which plays the pin's video in place. */
export function PinterestPlayer({ pin }: { pin: Pin }) {
  // The embed is the media plus a ~110px footer with the pinner's name.
  const height = Math.min(900, Math.round((EMBED_WIDTH * pin.height) / pin.width) + 110);
  return (
    <div className="embed">
      <iframe
        src={`https://assets.pinterest.com/ext/embed.html?id=${pin.id}`}
        width={EMBED_WIDTH}
        height={height}
        frameBorder="0"
        scrolling="no"
        allow="autoplay; encrypted-media"
        title="Pinterest video"
      />
    </div>
  );
}
