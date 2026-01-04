import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    VideoCameraIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    CalendarIcon,
    ClockIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import { meetingService, Meeting } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MeetingPlaybackTab from '../components/meeting-tabs/MeetingPlaybackTab';
import MeetingTranscriptTab from '../components/meeting-tabs/MeetingTranscriptTab';
import MeetingSummaryTab from '../components/meeting-tabs/MeetingSummaryTab';

type TabType = 'playback' | 'transcript' | 'summary';

export default function MeetingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('playback');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadMeeting(id);
        }
    }, [id]);

    const loadMeeting = async (meetingId: string) => {
        try {
            const data = await meetingService.getById(meetingId);
            setMeeting(data);

            // Default tab logic based on status
            if (data.status === 'processing') {
                setActiveTab('playback');
            } else if (data.status === 'ready' || data.status === 'shared') {
                setActiveTab('summary');
            }
        } catch (error) {
            console.error('Error loading meeting:', error);
            navigate('/meetings');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !meeting) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const currentUserRole = profile?.role || 'user';
    const isAdmin = currentUserRole === 'admin' || currentUserRole === 'staff';

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => navigate('/meetings')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Meetings
                </button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wide ${meeting.status === 'live' ? 'text-red-300 bg-red-500/10 border-red-400/30 animate-pulse' :
                                    meeting.status === 'processing' ? 'text-amber-200 bg-amber-500/10 border-amber-400/30' :
                                        meeting.status === 'ready' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' :
                                            'text-blue-300 bg-blue-500/10 border-blue-400/30'
                                }`}>
                                {meeting.status}
                            </span>
                            <span className="text-gray-500 text-sm">{meeting.type}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">{meeting.title}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <UserGroupIcon className="h-4 w-4" />
                                <span>{meeting.client?.name || 'No Client'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-4 w-4" />
                                <span>{meeting.meeting_time} ({meeting.duration_minutes}m)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isAdmin && (
                            <button className="btn-secondary px-4 py-2 rounded-xl text-sm">
                                Edit Details
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10">
                <div className="flex items-center gap-8">
                    <TabButton
                        active={activeTab === 'playback'}
                        onClick={() => setActiveTab('playback')}
                        icon={VideoCameraIcon}
                        label="Playback"
                    />
                    <TabButton
                        active={activeTab === 'transcript'}
                        onClick={() => setActiveTab('transcript')}
                        icon={DocumentTextIcon}
                        label="Transcript"
                    />
                    <TabButton
                        active={activeTab === 'summary'}
                        onClick={() => setActiveTab('summary')}
                        icon={ClipboardDocumentCheckIcon}
                        label="Summary & Notes"
                    />
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'playback' && (
                    <MeetingPlaybackTab meeting={meeting} />
                )}
                {activeTab === 'transcript' && (
                    <MeetingTranscriptTab meeting={meeting} />
                )}
                {activeTab === 'summary' && (
                    <MeetingSummaryTab meeting={meeting} currentUserRole={currentUserRole} />
                )}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-all ${active
                    ? 'border-[#3aa3eb] text-[#3aa3eb]'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                }`}
        >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{label}</span>
        </button>
    );
}
