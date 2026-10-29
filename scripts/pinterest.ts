import type { Pin } from "../lib/types.ts";

// Pinterest's public widget endpoints (the ones its embed widgets use). No account or app needed,
// but the board must be public. The board feed only returns the newest ~50 pins, so sync.ts keeps
// every pin it has seen, and older ones can be listed in extra-pins.txt.
const WIDGETS = "https://widgets.pinterest.com/v3/pidgets";

type RawPin = {
  id: string;
  title?: string | null;
  grid_title?: string | null;
  description?: string | null;
  link?: string | null;
  is_video?: boolean;
  images?: Record<string, { url: string; width: number; height: number }>;
  pinner?: { profile_url?: string };
};

function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

function toPin(raw: RawPin): Pin {
  const img = raw.images?.["564x"] ?? Object.values(raw.images ?? {}).pop();
  return {
    id: String(raw.id),
    title: decode(raw.title || raw.grid_title || ""),
    description: decode(raw.description || ""),
    link: raw.link ? decode(raw.link) : null,
    image: img?.url ?? null,
    original: img?.url.replace(/\/\d+x\//, "/originals/") ?? null,
    width: img?.width ?? 1,
    height: img?.height ?? 1,
    isVideo: !!raw.is_video,
  };
}

async function widget<T>(path: string): Promise<T> {
  const res = await fetch(`${WIDGETS}${path}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; YumSum/1.0)" } });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status !== "success") {
    throw new Error(`Pinterest couldn't load ${path} (${res.status}). Is the board public and the name right?`);
  }
  return body.data as T;
}

export async function boardPins(username: string, board: string): Promise<Pin[]> {
  const data = await widget<{ pins: RawPin[] }>(`/boards/${username}/${board}/pins/`);
  return data.pins.map(toPin);
}

async function pinIdFrom(link: string): Promise<string | null> {
  const direct = link.match(/pin\/(\d+)/)?.[1] ?? (/^\d{6,}$/.test(link) ? link : null);
  if (direct) return direct;
  // pin.it short links redirect to the full pin URL.
  if (/pin\.it\//.test(link)) {
    const res = await fetch(link.startsWith("http") ? link : `https://${link}`, { redirect: "manual" });
    return res.headers.get("location")?.match(/pin\/(\d+)/)?.[1] ?? null;
  }
  return null;
}

/** Looks up pins by link. Only pins saved by `username` are returned. */
export async function pinsFromLinks(links: string[], username: string): Promise<Pin[]> {
  const ids = (await Promise.all(links.map((l) => pinIdFrom(l).catch(() => null)))).filter((id): id is string => !!id);
  const out: Pin[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const raw = await widget<RawPin[]>(`/pins/info/?pin_ids=${ids.slice(i, i + 50).join(",")}`);
    const mine = raw.filter((p) => p.pinner?.profile_url?.toLowerCase().includes(`pinterest.com/${username}/`));
    out.push(...mine.map(toPin));
  }
  return out;
}
