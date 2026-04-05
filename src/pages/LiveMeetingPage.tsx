import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import WherebyRoom from '../components/WherebyRoom';
import ConfirmDialog from '../components/ConfirmDialog';
import {
    ChatBubbleLeftRightIcon,
    PhoneXMarkIcon,
    VideoCameraIcon,
    LinkIcon,
    CheckIcon
} from '@heroicons/react/24/solid';
import { meetingService, Meeting } from '../lib/supabase';
import { createWherebyRoom } from '../lib/whereby';
import { useAuth } from '../contexts/AuthContext';
import MeetingNotesEditor from '../components/MeetingNotesEditor';

type RoomState = 'loading' | 'ready' | 'error';

export default function LiveMeetingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [roomUrl, setRoomUrl] = useState<string | null>(null);
    const [roomState, setRoomState] = useState<RoomState>('loading');
    const [roomError, setRoomError] = useState<string | null>(null);

    const [showNotes, setShowNotes] = useState(true);
    const [isEndCallOpen, setIsEndCallOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // ── Load meeting + resolve room URL ──────────────────────────
    useEffect(() => {
        if (id) loadMeetingAndRoom(id);
    }, [id]);

    const loadMeetingAndRoom = async (meetingId: string) => {
        try {
            setRoomState('loading');
            const data = await meetingService.getById(meetingId);
            setMeeting(data);

            // Prefer the existing meeting_url if available
            if (data.meeting_url) {
                setRoomUrl(data.meeting_url);
                setRoomState('ready');
                return;
            }

            // No room URL yet — create one via Whereby API
            const whereby = await createWherebyRoom({
                roomNamePrefix: 'wisemedia',
                endDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4h
            });

            setRoomUrl(whereby.roomUrl);
            setRoomState('ready');

            // Persist the new URL back to the meeting record so future joins reuse it
            try {
                await meetingService.update(meetingId, {
                    meeting_url: whereby.roomUrl,
                    status: 'live',
                });
            } catch (saveErr) {
                // Non-fatal — room still works, just won't be persisted
                console.warn('[LiveMeetingPage] Could not persist room URL:', saveErr);
            }

        } catch (err: any) {
            console.error('[LiveMeetingPage] Error:', err);
            const msg = err?.message ?? 'Unknown error';

            // If it's a Whereby API error in dev mode (e.g. missing key), show inline error
            if (msg.includes('Whereby API error') || msg.includes('Failed to fetch')) {
                setRoomError(msg);
                setRoomState('error');
            } else {
                // If meeting itself wasn't found, go back
                navigate('/meetings');
            }
        }
    };

    // ── Controls ─────────────────────────────────────────────────
    const handleCopyLink = () => {
        if (!roomUrl) return;
        navigator.clipboard.writeText(roomUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleEndCall = () => setIsEndCallOpen(true);

    const confirmEndCall = async () => {
        if (!meeting || !id) return;
        setIsEndCallOpen(false);
        try {
            await meetingService.updateStatus(id, 'ready');
            navigate('/meetings');
        } catch (err) {
            console.error('Error ending call:', err);
        }
    };

    const handleSaveNotes = async (content: string) => {
        console.log('[LiveMeetingPage] Saving notes:', content);
    };

    // ── Loading state ─────────────────────────────────────────────
    if (!meeting && roomState === 'loading') {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden gap-6">
            <GlassCard disableHover className="flex-1 flex flex-col overflow-hidden p-0 !bg-slate-900/50">

                {/* ── Top Bar ──────────────────────────────────────── */}
                <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between z-10 bg-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {meeting?.title ?? 'Live Meeting'}
                        </h1>
                        <div className="h-6 w-px bg-white/10 hidden sm:block" />
                    </div>
                    {/* Participant avatars */}
                    <div className="flex -space-x-2">
                        {meeting?.participants?.map((p, i) => (
                            <div
                                key={i}
                                title={p.name}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3aa3eb] to-purple-600 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-bold cursor-default"
                            >
                                {p.name.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main Content ──────────────────────────────────── */}
                <div className="flex-1 flex overflow-hidden min-h-0">

                    {/* ── Video Area ───────────────────────────────── */}
                    <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 min-w-0">

                        {/* Whereby embed or error state */}
                        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/50">
                            {roomState === 'loading' && (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3aa3eb]" />
                                    <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        Creating your room…
                                    </p>
                                </div>
                            )}

                            {roomState === 'error' && (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                                    <VideoCameraIcon className="h-12 w-12 text-red-400/60" />
                                    <p className="text-white font-semibold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        Could not start video room
                                    </p>
                                    <p className="text-gray-500 text-sm max-w-sm">
                                        {roomError ?? 'An unexpected error occurred. Please check your Whereby API key and try again.'}
                                    </p>
                                    <button
                                        onClick={() => id && loadMeetingAndRoom(id)}
                                        className="mt-2 px-5 py-2 bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] border border-[#3aa3eb]/30 rounded-xl text-sm font-semibold transition-all"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {roomState === 'ready' && roomUrl && (
                                <WherebyRoom
                                    roomUrl={roomUrl}
                                    displayName={profile?.full_name ?? 'Host'}
                                    className="w-full h-full"
                                    onJoin={() => console.log('[LiveMeetingPage] Joined Whereby room')}
                                    onLeave={() => console.log('[LiveMeetingPage] Left Whereby room')}
                                />
                            )}
                        </div>

                        {/* ── Controls Bar ─────────────────────────── */}
                        <div className="h-20 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center gap-6 px-8 border border-white/10 shrink-0">
                            {/* Copy Link */}
                            <ControlBtn
                                icon={isCopied ? CheckIcon : LinkIcon}
                                active={isCopied}
                                onClick={handleCopyLink}
                                label={isCopied ? 'Copied!' : 'Copy Link'}
                            />

                            <div className="w-px h-8 bg-white/10" />

                            <ControlBtn
                                icon={ChatBubbleLeftRightIcon}
                                active={showNotes}
                                onClick={() => setShowNotes(!showNotes)}
                                label="Notes"
                            />

                            {/* End Call */}
                            <button
                                onClick={handleEndCall}
                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all ml-2 shadow-lg shadow-red-500/20 flex items-center gap-2"
                            >
                                <PhoneXMarkIcon className="h-5 w-5" />
                                <span className="text-sm hidden sm:block">End Call</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Notes Side Panel ─────────────────────────── */}
                    {showNotes && (
                        <div className="w-80 xl:w-96 border-l border-white/10 bg-black/20 p-5 flex flex-col gap-4 shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white font-bold text-sm uppercase tracking-wide" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    Meeting Notes
                                </h2>
                                <button
                                    onClick={() => setShowNotes(false)}
                                    className="text-gray-500 hover:text-white text-xs transition-colors"
                                >
                                    Hide
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                <MeetingNotesEditor
                                    onSave={handleSaveNotes}
                                    autoSaveInterval={2000}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* ── End Call Confirm Dialog ───────────────────────── */}
            <ConfirmDialog
                isOpen={isEndCallOpen}
                onClose={() => setIsEndCallOpen(false)}
                onConfirm={confirmEndCall}
                title="End Meeting?"
                message={`Are you sure you want to end "${meeting?.title ?? 'this meeting'}"? The session will be marked as processing.`}
                confirmText="End Call"
                cancelText="Stay in Call"
            />
        </div>
    );
}

// ── Helper component ──────────────────────────────────────────────
function ControlBtn({ icon: Icon, active, onClick, alert, label }: {
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick: () => void;
    alert?: boolean;
    label?: string;
}) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`p-4 rounded-xl transition-all ${alert
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                : active
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <Icon className="h-6 w-6" />
        </button>
    );
}
