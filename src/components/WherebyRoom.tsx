import { useEffect, useRef, useState } from 'react';
import '@whereby.com/browser-sdk/embed'; // Imports and registers <whereby-embed>

interface WherebyRoomProps {
  /** Full Whereby room URL */
  roomUrl: string;
  /** Name displayed to other participants */
  displayName?: string;
  /** Initial audio state — only applied on first mount */
  audio?: 'on' | 'off';
  /** Initial video state — only applied on first mount */
  video?: 'on' | 'off';
  /** Called when the local user joins the room */
  onJoin?: () => void;
  /** Called when the local user leaves the room */
  onLeave?: () => void;
  className?: string;
}

type PermState = 'idle' | 'granted' | 'denied' | 'prompt';

/**
 * WherebyRoom
 * ---------------------------------------------------------------
 * Renders the <whereby-embed> Web Component using the official
 * npm package (@whereby.com/browser-sdk). This avoids all CORS 
 * issues associated with loading the CDN module script dynamically.
 * ---------------------------------------------------------------
 */
export default function WherebyRoom({
  roomUrl,
  displayName = 'User',
  audio = 'on',
  video = 'on',
  onJoin,
  onLeave,
  className = '',
}: WherebyRoomProps) {
  const [camPerm, setCamPerm] = useState<PermState>('idle');
  const [micPerm, setMicPerm] = useState<PermState>('idle');
  const embedRef = useRef<HTMLElement | null>(null);

  // ── 1. Check browser permissions proactively ────────────────────
  useEffect(() => {
    const check = async () => {
      if (!navigator.permissions) return;
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
        ]);
        setCamPerm(cam.state as PermState);
        setMicPerm(mic.state as PermState);
        cam.onchange = () => setCamPerm(cam.state as PermState);
        mic.onchange = () => setMicPerm(mic.state as PermState);
      } catch {
        // Permissions API not supported — proceed anyway
      }
    };
    check();
  }, []);

  // ── 2. Attach Whereby event listeners ───────────────────────────
  useEffect(() => {
    const el = embedRef.current;
    if (!el) return;

    if (onJoin) {
      el.addEventListener('ready', onJoin);
      el.addEventListener('join', onJoin);
    }
    if (onLeave) {
      el.addEventListener('leave', onLeave);
    }

    return () => {
      if (onJoin) {
        el.removeEventListener('ready', onJoin);
        el.removeEventListener('join', onJoin);
      }
      if (onLeave) {
        el.removeEventListener('leave', onLeave);
      }
    };
  }, [onJoin, onLeave]);

  const permDenied = camPerm === 'denied' || micPerm === 'denied';

  return (
    <div className={`relative w-full h-full flex flex-col ${className}`}>

      {/* ── PERMISSION DENIED BANNER ─────────────────────────────── */}
      {permDenied && (
        <div className="shrink-0 mx-4 mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl px-4 py-3 text-sm">
          <span className="text-xl leading-none mt-0.5">⚠️</span>
          <div style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <strong className="block mb-0.5">Camera / microphone blocked</strong>
            <span className="text-amber-400/80 text-xs leading-relaxed">
              Click the <strong>🔒 lock icon</strong> in your browser's address bar →{' '}
              set Camera &amp; Microphone to <strong>Allow</strong> → then refresh the page.
            </span>
          </div>
        </div>
      )}

      {/* ── WHEREBY EMBED ────────────────────────────────────────── */}
      <div className={`min-h-0 ${permDenied ? 'flex-1 mt-2' : 'absolute inset-0'}`}>
        {/* @ts-ignore — custom element ref typing */}
        <whereby-embed
          ref={embedRef}
          room={roomUrl}
          display-name={displayName}
          audio={audio}
          video={video}
          screenshare="on"
          chat="on"
          background="off"
          people="on"
          logo="off"
          leaveButton="off"
          title="Wise Media Meeting"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: permDenied ? '0 0 1rem 1rem' : '1rem',
            border: 'none',
          }}
        />
      </div>

    </div>
  );
}
