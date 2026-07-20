import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface YouTubeEntry {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
}

function parseISO8601Duration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = parseInt(match[1] || "0", 10);
  const m = parseInt(match[2] || "0", 10);
  const s = parseInt(match[3] || "0", 10);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeRSS(channelHandle: string): Promise<YouTubeEntry[]> {
  // YouTube RSS feed requires channel ID, but we can use the handle via a lookup
  // For @CodyConsultant, we use the known RSS feed URL format
  // Fallback: use the handle-based RSS endpoint
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelHandle}`;

  const resp = await fetch(rssUrl);
  if (!resp.ok) {
    throw new Error(`YouTube RSS fetch failed: ${resp.status}`);
  }
  const xml = await resp.text();

  const entries: YouTubeEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let entryMatch;
  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const block = entryMatch[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = block.match(/<title>([^<]+)<\/title>/);
    const descMatch = block.match(/<media:description>([^<]*)<\/media:description>/);
    const thumbMatch = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
    const pubMatch = block.match(/<published>([^<]+)<\/published>/);
    const durMatch = block.match(/<yt:durationSeconds>(\d+)<\/yt:durationSeconds>/);

    if (idMatch) {
      entries.push({
        id: idMatch[1],
        title: titleMatch ? titleMatch[1] : "Untitled",
        description: descMatch ? descMatch[1] : "",
        thumbnail: thumbMatch ? thumbMatch[1] : "",
        publishedAt: pubMatch ? pubMatch[1] : new Date().toISOString(),
        duration: durMatch ? parseISO8601Duration(`PT${durMatch[1]}S`) : undefined,
      });
    }
  }
  return entries;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { source, channelId } = body;

    if (source === "youtube" && channelId) {
      const entries = await fetchYouTubeRSS(channelId);

      let inserted = 0;
      let updated = 0;
      for (const entry of entries) {
        const item = {
          source: "youtube" as const,
          external_id: entry.id,
          title: entry.title,
          description: entry.description,
          body: entry.description,
          author_name: "Cody Wise",
          author_avatar: null,
          cover_image_url: entry.thumbnail,
          category: "YouTube",
          tags: [],
          media_urls: [{ type: "video", url: `https://www.youtube.com/watch?v=${entry.id}` }],
          external_url: `https://www.youtube.com/watch?v=${entry.id}`,
          published_at: entry.publishedAt,
          duration: entry.duration,
          synced_at: new Date().toISOString(),
        };

        const { data: existing } = await supabase
          .from("content_hub_items")
          .select("id")
          .eq("source", "youtube")
          .eq("external_id", entry.id)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("content_hub_items")
            .update({
              title: item.title,
              description: item.description,
              cover_image_url: item.cover_image_url,
              duration: item.duration,
              synced_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (!error) updated++;
        } else {
          const { error } = await supabase
            .from("content_hub_items")
            .insert(item);
          if (!error) inserted++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, source: "youtube", inserted, updated, total: entries.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown source or missing channelId" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
