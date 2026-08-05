import { useState } from 'react';
import { ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const WHEREBY_URL = 'https://wisemedia.whereby.com/meeting7996a103-885c-42b4-bda1-c2d02d5ee927';

export default function MeetingsPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden gap-4">
      <PageHeader
        title="Meetings"
        subtitle="Join your meeting instantly."
        action={
          <a
            href={WHEREBY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-header-glass shrink-0 flex items-center gap-2"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
            <span className="btn-text-glow text-sm">Open in New Tab</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </a>
        }
      />

      <div className="flex-1 min-h-0 rounded-2xl border border-white/10 overflow-hidden relative" style={{ background: '#0d0d0f' }}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#3aa3eb]/30 border-t-[#3aa3eb]" />
            <p className="text-sm text-gray-400">Loading conference room…</p>
          </div>
        )}
        <iframe
          src={WHEREBY_URL}
          allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
          className="absolute inset-0 w-full h-full"
          style={{ border: 'none' }}
          title="Conference Room"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
