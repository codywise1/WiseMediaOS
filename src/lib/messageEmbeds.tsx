// Renders message body text with inline YouTube/Vimeo embeds for any detected video URLs.
// Returns an array of React nodes (text segments + embed blocks).

import React from 'react';

const YOUTUBE_RE = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
const VIMEO_RE = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:\w+\/)?|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;

export function getYouTubeId(url: string): string | null {
  const m = url.match(YOUTUBE_RE);
  return m && m[2].length === 11 ? m[2] : null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(VIMEO_RE);
  return m && m[1] ? m[1] : null;
}

export function isVideoUrl(url: string): boolean {
  const l = url.toLowerCase();
  return (
    l.endsWith('.mp4') ||
    l.endsWith('.webm') ||
    l.endsWith('.ogg') ||
    l.endsWith('.mov') ||
    l.includes('youtube.com/watch') ||
    l.includes('youtu.be') ||
    l.includes('vimeo.com')
  );
}

// URL regex for splitting text — matches http/https links
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

export function renderMessageBody(body: string, opts?: { maxEmbedWidth?: string }): React.ReactNode[] {
  if (!body) return [];
  const maxW = opts?.maxEmbedWidth || 'max-w-sm';
  const parts = body.split(URL_RE);
  const nodes: React.ReactNode[] = [];

  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      // It's a URL — check for video embed
      const yt = getYouTubeId(part);
      const vim = getVimeoId(part);
      if (yt) {
        nodes.push(
          <div key={`emb-${i}`} className={`relative pb-[56.25%] h-0 rounded-lg overflow-hidden border border-white/10 my-1.5 ${maxW}`}>
            <iframe
              src={`https://www.youtube.com/embed/${yt}`}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
        );
        return;
      }
      if (vim) {
        nodes.push(
          <div key={`emb-${i}`} className={`relative pb-[56.25%] h-0 rounded-lg overflow-hidden border border-white/10 my-1.5 ${maxW}`}>
            <iframe
              src={`https://player.vimeo.com/video/${vim}`}
              className="absolute top-0 left-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo video"
            />
          </div>
        );
        return;
      }
      // Plain link
      nodes.push(
        <a
          key={`lnk-${i}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-[#59a1e5] hover:underline break-all"
        >
          {part}
        </a>
      );
      return;
    }
    // Plain text segment
    if (part) nodes.push(<React.Fragment key={`txt-${i}`}>{part}</React.Fragment>);
  });

  return nodes;
}
