import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    MicrophoneIcon,
    VideoCameraIcon,
    PhoneXMarkIcon,
    ComputerDesktopIcon,
    ChatBubbleLeftRightIcon,
    UserGroupIcon,
    StopIcon,
    PlayIcon,
    PauseIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/solid';
import {
    MicrophoneIcon as MicOffIcon,
    VideoCameraIcon as VideoOffIcon
} from '@heroicons/react/24/outline';
import { meetingService, Meeting } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MeetingNotesEditor from '../components/MeetingNotesEditor';

export default function LiveMeetingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<'stopped' | 'recording' | 'paused'>('stopped');
    const [duration, setDuration] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            loadMeeting(id);
        }
    }, [id]);

    useEffect(() => {
        if (recordingStatus === 'recording') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [recordingStatus]);

    const loadMeeting = async (meetingId: string) => {
        console.log('[LiveMeetingPage] Loading meeting:', meetingId);
        try {
            const data = await meetingService.getById(meetingId);
            console.log('[LiveMeetingPage] Meeting data loaded:', data);
            setMeeting(data);
            if (data.is_recording) {
                setRecordingStatus('recording');
            }
            setLoading(false);
        } catch (error) {
            console.error('[LiveMeetingPage] Error loading meeting:', error);
            // If we fail to load, we go back to the list
            navigate('/meetings');
        }
    };

    const toggleRecording = async () => {
        if (!meeting || !id) return;

        try {
            if (recordingStatus === 'stopped') {
                await meetingService.startRecording(id);
                setRecordingStatus('recording');
            } else if (recordingStatus === 'recording') {
                // Just pause locally for demo, API doesn't support pause state yet
                setRecordingStatus('paused');
            } else {
                setRecordingStatus('recording');
            }
        } catch (error) {
            console.error('Error toggling recording:', error);
        }
    };

    const handleEndCall = async () => {
        if (!meeting || !id) return;
        if (window.confirm('Are you sure you want to end the meeting?')) {
            try {
                await meetingService.stopRecording(id);
                await meetingService.updateStatus(id, 'processing');
                navigate('/meetings');
            } catch (error) {
                console.error('Error ending call:', error);
            }
        }
    };

    const handleSaveNotes = async (content: string) => {
        // In a real app, we'd save to a notes record linked to the meeting
        console.log('Saving notes:', content);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading || !meeting) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-6 flex items-center justify-between z-10">
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
                <div className="flex-1 p-4 flex flex-col gap-4 relative">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Self View */}
                        <div className="bg-slate-900 rounded-2xl relative overflow-hidden border border-white/10 group">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
                                    <span className="text-3xl text-white font-bold">{profile?.name?.charAt(0) || 'M'}</span>
                                </div>
                            </div>
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-white text-sm font-medium">
                                You {isMuted && '(Muted)'}
                            </div>
                            {/* Fake Audio Waveform */}
                            <div className="absolute bottom-4 right-4 flex items-end gap-1 h-6">
                                {[1, 2, 3, 2, 1].map((h, i) => (
                                    <div key={i} className={`w-1 bg-green-500 rounded-full animate-pulse`} style={{ height: `${h * 20}%` }} />
                                ))}
                            </div>
                        </div>

                        {/* Client View */}
                        <div className="bg-slate-900 rounded-2xl relative overflow-hidden border border-white/10">
                            <img
                                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                                alt="Client"
                                className="absolute inset-0 w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded-lg text-white text-sm font-medium">
                                {meeting.client?.name || 'Client'}
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar */}
                    <div className="h-20 glass-card rounded-2xl mb-4 mx-auto flex items-center gap-6 px-8 border border-white/10">
                        <ControlBtn
                            icon={isMuted ? MicOffIcon : MicrophoneIcon}
                            active={!isMuted}
                            onClick={() => setIsMuted(!isMuted)}
                            alert={isMuted}
                        />
                        <ControlBtn
                            icon={isVideoOff ? VideoOffIcon : VideoCameraIcon}
                            active={!isVideoOff}
                            onClick={() => setIsVideoOff(!isVideoOff)}
                            alert={isVideoOff}
                        />
                        <ControlBtn
                            icon={ComputerDesktopIcon}
                            active={isScreenSharing}
                            onClick={() => setIsScreenSharing(!isScreenSharing)}
                        />

                        <div className="w-px h-8 bg-white/10" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleRecording}
                                className={`p-4 rounded-full transition-all ${recordingStatus === 'recording'
                                    ? 'bg-red-500/20 text-red-500 animate-pulse'
                                    : 'bg-white/5 hover:bg-white/10 text-white'
                                    }`}
                            >
                                {recordingStatus === 'recording' ? <StopIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
                            </button>
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        <ControlBtn
                            icon={ChatBubbleLeftRightIcon}
                            active={showNotes}
                            onClick={() => setShowNotes(!showNotes)}
                        />

                        <button
                            onClick={handleEndCall}
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all ml-4 shadow-lg shadow-red-500/20"
                        >
                            <PhoneXMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Notes Side Panel */}
                {showNotes && (
                    <div className="w-96 border-l border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 flex flex-col gap-4 transition-all">
                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-bold">Meeting Notes</h2>
                            <button onClick={() => setShowNotes(false)} className="text-gray-400 hover:text-white">
                                <ArrowsPointingOutIcon className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden rounded-xl border border-white/10">
                            <MeetingNotesEditor
                                onSave={handleSaveNotes}
                                autoSaveInterval={2000}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ControlBtn({ icon: Icon, active, onClick, alert }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl transition-all ${alert
                ? 'bg-red-500 text-white'
                : active
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
        >
            <Icon className="h-6 w-6" />
        </button>
    );
}
