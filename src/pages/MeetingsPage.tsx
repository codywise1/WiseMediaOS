import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    VideoCameraIcon,
    MagnifyingGlassIcon,
    VideoCameraSlashIcon,
    ArrowsPointingOutIcon,
    CalendarDaysIcon,
    UsersIcon,
    ClockIcon,
    XMarkIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { ArrowRight, Video, Calendar, History, Radio } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
    meetingService,
    clientService,
    projectService,
    Meeting,
    Client,
    Project,
    MeetingStatus,
    authService,
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import ConfirmDialog from '../components/ConfirmDialog';

const WHEREBY_URL = 'https://wisemedia.whereby.com/meeting7996a103-885c-42b4-bda1-c2d02d5ee927';

type ViewTab = 'upcoming' | 'past' | 'live';

export default function MeetingsPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [conferenceOpen, setConferenceOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('upcoming');

    const currentUser = profile ? {
        id: profile.id,
        role: profile.role,
        name: profile.full_name || ''
    } : null;

    useLoadingGuard(loading, setLoading);

    useEffect(() => {
        loadData();
    }, [profile?.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            await authService.ensureValidSession();
            const results = await Promise.allSettled([
                meetingService.getAll(),
            ]);
            const meetingsData = results[0].status === 'fulfilled' ? results[0].value : [];
            setMeetings(meetingsData);
        } catch (error) {
            console.error('Error loading meetings data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMeeting = (meeting: Meeting) => {
        if (!meeting.id) return;
        if (meeting.status === 'live' || meeting.status === 'scheduled') {
            navigate(`/meetings/live/${meeting.id}`);
        } else if (meeting.meeting_url) {
            window.open(meeting.meeting_url, '_blank');
        }
    };

    const handleViewDetails = (meeting: Meeting) => {
        if (meeting.id) navigate(`/meetings/${meeting.id}`);
    };

    const handleDeleteMeeting = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedMeeting) {
            try {
                await meetingService.delete(selectedMeeting.id);
                setIsDeleteDialogOpen(false);
                setSelectedMeeting(null);
                loadData();
            } catch (error) {
                console.error('Error deleting meeting:', error);
            }
        }
    };

    const now = new Date();

    const liveMeetings = meetings.filter(m => m.status === 'live');
    const upcomingMeetings = meetings.filter(m => {
        const meetingDate = new Date(`${m.meeting_date}T${m.meeting_time}`);
        return meetingDate >= now && m.status !== 'live';
    });
    const pastMeetings = meetings.filter(m => {
        const meetingDate = new Date(`${m.meeting_date}T${m.meeting_time}`);
        return meetingDate < now && m.status !== 'live';
    });

    const tabMeetings = activeTab === 'live' ? liveMeetings : activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

    const filteredMeetings = tabMeetings.filter(meeting => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return meeting.title.toLowerCase().includes(q) ||
            meeting.client?.name.toLowerCase().includes(q);
    });

    if (loading) return null;

    const tabs: { key: ViewTab; label: string; icon: React.ElementType; count: number; accent: string }[] = [
        { key: 'live', label: 'Live Now', icon: Radio, count: liveMeetings.length, accent: 'text-red-400' },
        { key: 'upcoming', label: 'Upcoming', icon: Calendar, count: upcomingMeetings.length, accent: 'text-[#3aa3eb]' },
        { key: 'past', label: 'Past', icon: History, count: pastMeetings.length, accent: 'text-gray-400' },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden gap-4">
            <PageHeader
                title="Meetings"
                subtitle="Schedule, join, and review your calls"
                action={
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button
                            onClick={() => setConferenceOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-wide text-xs transition-all"
                        >
                            <VideoCameraIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Conference Room</span>
                        </button>
                        <button
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="btn-header-glass shrink-0"
                        >
                            <span className="btn-text-glow text-sm">Schedule</span>
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </button>
                    </div>
                }
            />

            <div className="flex-1 flex overflow-hidden gap-4 min-h-0">
                {/* Primary: meetings list */}
                <div className="flex-1 flex flex-col glass-card rounded-2xl border border-white/10 overflow-hidden min-w-0">
                    {/* Tabs */}
                    <div className="flex items-center gap-1 p-3 border-b border-white/10 shrink-0">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                        isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <tab.icon size={15} className={isActive ? tab.accent : 'text-gray-500'} />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                            tab.key === 'live' ? 'bg-red-500/30 text-red-300' :
                                            isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-500'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                    {tab.key === 'live' && tab.count > 0 && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search */}
                    <div className="p-3 border-b border-white/5 shrink-0">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by title or client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Meeting list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                        {filteredMeetings.length > 0 ? (
                            filteredMeetings.map(meeting => (
                                <MeetingRow
                                    key={meeting.id}
                                    meeting={meeting}
                                    onJoin={handleJoinMeeting}
                                    onViewDetails={handleViewDetails}
                                    onDelete={handleDeleteMeeting}
                                    isAdmin={currentUser?.role === 'admin'}
                                    isPast={activeTab === 'past'}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <VideoCameraSlashIcon className="h-12 w-12 text-gray-700 mb-3" />
                                <h3 className="text-sm font-bold text-gray-400">
                                    {activeTab === 'live' ? 'No live meetings' :
                                     activeTab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
                                </h3>
                                <p className="text-gray-600 text-xs mt-1 max-w-xs">
                                    {activeTab === 'upcoming' ? 'Schedule a meeting to get started.' :
                                     activeTab === 'live' ? 'Start a meeting from an upcoming slot or the conference room.' :
                                     'Past meetings will appear here after they conclude.'}
                                </p>
                                {activeTab === 'upcoming' && (
                                    <button
                                        onClick={() => setIsScheduleModalOpen(true)}
                                        className="mt-4 flex items-center gap-1.5 text-xs text-[#3aa3eb] hover:text-[#59a1e5] font-medium"
                                    >
                                        <PlusIcon className="h-3.5 w-3.5" /> Schedule a meeting
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Secondary: conference room (collapsible) */}
                {conferenceOpen && (
                    <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 flex-col glass-card rounded-2xl border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-[#3aa3eb]/20 border border-[#3aa3eb]/30 shrink-0">
                                    <VideoCameraIcon className="h-5 w-5 text-[#3aa3eb]" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-white font-bold text-sm truncate">Conference Room</h2>
                                    <p className="text-gray-400 text-xs hidden sm:block">Always open — no link needed</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <a
                                    href={WHEREBY_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                    title="Open in new tab"
                                >
                                    <ArrowsPointingOutIcon className="h-4 w-4" />
                                </a>
                                <button
                                    onClick={() => setConferenceOpen(false)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                    title="Close conference room"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative bg-slate-950/50 min-h-0">
                            <iframe
                                src={WHEREBY_URL}
                                allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
                                className="absolute inset-0 w-full h-full"
                                style={{ border: 'none' }}
                                title="Conference Room"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile conference room — full screen overlay */}
            {conferenceOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-[#0d0d0f]">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                        <h2 className="text-white font-bold text-sm">Conference Room</h2>
                        <button
                            onClick={() => setConferenceOpen(false)}
                            className="p-2 rounded-lg bg-white/10 text-white"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 relative bg-slate-950">
                        <iframe
                            src={WHEREBY_URL}
                            allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
                            className="absolute inset-0 w-full h-full"
                            style={{ border: 'none' }}
                            title="Conference Room"
                        />
                    </div>
                </div>
            )}

            <ScheduleMeetingModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={loadData}
                currentUser={currentUser}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Meeting"
                message={`Are you sure you want to delete the meeting "${selectedMeeting?.title}"? This action cannot be undone.`}
            />
        </div>
    );
}

interface MeetingRowProps {
    meeting: Meeting;
    onJoin: (m: Meeting) => void;
    onViewDetails: (m: Meeting) => void;
    onDelete: (m: Meeting) => void;
    isAdmin: boolean;
    isPast: boolean;
}

function MeetingRow({ meeting, onJoin, onViewDetails, onDelete, isAdmin, isPast }: MeetingRowProps) {
    const isLive = meeting.status === 'live';
    return (
        <div className={`rounded-2xl border transition-all overflow-hidden ${
            isLive ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
        }`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-white font-bold text-base leading-tight line-clamp-2">{meeting.title}</h3>
                        <div className="flex flex-col gap-1.5 text-xs text-gray-400 mt-2">
                            <div className="flex items-center gap-1.5">
                                <UsersIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{meeting.client?.name || 'No client'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{meeting.meeting_date} at {meeting.meeting_time}</span>
                            </div>
                        </div>
                    </div>
                    <StatusPill status={meeting.status} />
                </div>
                <div className="flex items-center gap-2">
                    {!isPast ? (
                        <button
                            onClick={() => onJoin(meeting)}
                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                isLive
                                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                                    : 'bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] border border-[#3aa3eb]/30'
                            }`}
                        >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                            {isLive ? 'Join Live' : 'Join'}
                        </button>
                    ) : meeting.status === 'ready' || meeting.status === 'shared' ? (
                        <button
                            onClick={() => onViewDetails(meeting)}
                            className="flex-1 px-4 py-2 rounded-xl bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] border border-[#3aa3eb]/30 text-sm font-bold transition-all"
                        >
                            View Recap
                        </button>
                    ) : (
                        <button
                            onClick={() => onViewDetails(meeting)}
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold transition-all"
                        >
                            Details
                        </button>
                    )}
                    <button
                        onClick={() => onViewDetails(meeting)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold transition-all"
                    >
                        Details
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => onDelete(meeting)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: MeetingStatus }) {
    const styles: Record<string, string> = {
        live: 'bg-red-500/20 text-red-300 border-red-500/40',
        scheduled: 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-[#3aa3eb]/40',
        processing: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        shared: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${styles[status] || 'bg-white/10 text-gray-300 border-white/20'}`}>
            {status}
        </span>
    );
}
