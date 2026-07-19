import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import {
    PhoneXMarkIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/solid';
import { meetingService, Meeting } from '../lib/supabase';
import MeetingNotesEditor from '../components/MeetingNotesEditor';

const WHEREBY_URL = 'https://wisemedia.whereby.com/meeting7996a103-885c-42b4-bda1-c2d02d5ee927';

export default function LiveMeetingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [duration, setDuration] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            loadMeeting(id);
        }
    }, [id]);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const loadMeeting = async (meetingId: string) => {
        try {
            const data = await meetingService.getById(meetingId);
            setMeeting(data);
            setLoading(false);
        } catch (error) {
            console.error('[LiveMeetingPage] Error loading meeting:', error);
            navigate('/meetings');
        }
    };

    const handleEndCall = async () => {
        if (!meeting || !id) return;
        if (window.confirm('Are you sure you want to end the meeting?')) {
            try {
                await meetingService.updateStatus(id, 'processing');
                navigate('/meetings');
            } catch (error) {
                console.error('Error ending call:', error);
            }
        }
    };

    const handleSaveNotes = async (content: string) => {
        console.log('Saving notes:', content);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading || !meeting) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden gap-6">
            <GlassCard disableHover className="flex-1 flex flex-col overflow-hidden p-0 !bg-slate-900/50">
                {/* Top Bar */}
                <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between z-10 bg-white/5">
                    <div className="flex items-center gap-4">
                        <h1 className="text-white font-bold text-lg">{meeting.title}</h1>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-red-400 font-mono font-medium">{formatDuration(duration)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {meeting.participants.map((p, i) => (
                                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-bold">
                                    {p.name.charAt(0)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Video Area */}
                    <div className="flex-1 p-4 flex flex-col gap-4 relative overflow-hidden">
                        <div className="flex-1 rounded-2xl relative overflow-hidden border border-white/10 bg-slate-950/50">
                            <iframe
                                src={WHEREBY_URL}
                                allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
                                className="w-full h-full"
                                style={{ minHeight: 700, border: 'none' }}
                                title="Meeting Room"
                            />
                        </div>

                        {/* Controls Bar */}
                        <div className="h-20 bg-white/5 backdrop-blur-xl rounded-2xl mb-2 mx-auto flex items-center gap-6 px-8 border border-white/10 shrink-0">
                            <a
                                href={WHEREBY_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
                                title="Open in new tab"
                            >
                                <ArrowsPointingOutIcon className="h-6 w-6" />
                            </a>

                            <div className="w-px h-8 bg-white/10" />

                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`px-4 py-3 rounded-xl font-medium transition-all ${showNotes ? 'bg-white/10 text-white' : 'bg-transparent text-gray-400 hover:text-white'}`}
                            >
                                {showNotes ? 'Hide Notes' : 'Show Notes'}
                            </button>

                            <button
                                onClick={handleEndCall}
                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all ml-4 shadow-lg shadow-red-500/20 flex items-center gap-2"
                            >
                                <PhoneXMarkIcon className="h-6 w-6" />
                                End Call
                            </button>
                        </div>
                    </div>

                    {/* Notes Side Panel */}
                    {showNotes && (
                        <div className="w-96 border-l border-white/10 bg-black/20 p-6 flex flex-col gap-4 transition-all">
                            <div className="flex items-center justify-between">
                                <h2 className="text-white font-bold">Meeting Notes</h2>
                                <button onClick={() => setShowNotes(false)} className="text-gray-400 hover:text-white">
                                    <ArrowsPointingOutIcon className="h-4 w-4" />
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
        </div>
    );
}
