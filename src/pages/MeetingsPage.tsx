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
} from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
    meetingService,
    clientService,
    projectService,
    Meeting,
    Client,
    Project,
    MeetingStatus
} from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLoadingGuard } from '../hooks/useLoadingGuard';
import MeetingCard from '../components/MeetingCard';
import ScheduleMeetingModal from '../components/ScheduleMeetingModal';
import ConfirmDialog from '../components/ConfirmDialog';

const WHEREBY_URL = 'https://wisemedia.whereby.com/meeting7996a103-885c-42b4-bda1-c2d02d5ee927';

export default function MeetingsPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

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
            const [meetingsData, clientsData, projectsData] = await Promise.all([
                meetingService.getAll(),
                clientService.getAll(),
                projectService.getAll()
            ]);
            setMeetings(meetingsData);
            setClients(clientsData);
            setProjects(projectsData);
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

    const filteredMeetings = meetings.filter(meeting => {
        const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            meeting.client?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
        let matchesDate = true;
        const now = new Date();
        const meetingDate = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);
        if (dateFilter === 'upcoming') {
            matchesDate = meetingDate >= now || meeting.status === 'live';
        } else if (dateFilter === 'past') {
            matchesDate = meetingDate < now && meeting.status !== 'live';
        }
        return matchesSearch && matchesStatus && matchesDate;
    });

    const liveMeeting = filteredMeetings.find(m => m.status === 'live');

    if (loading) return null;

    return (
        <div className="h-full flex flex-col overflow-hidden gap-4">
            <PageHeader
                title="Meetings"
                subtitle="Conference room is live — join anytime"
                action={
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {liveMeeting && (
                            <button
                                onClick={() => handleJoinMeeting(liveMeeting)}
                                className="px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full font-bold uppercase tracking-wide text-xs transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse flex items-center gap-2"
                            >
                                <VideoCameraIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Join Live</span>
                            </button>
                        )}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all"
                            title="View meetings"
                        >
                            <CalendarDaysIcon className="h-5 w-5" />
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

            {/* Main split layout: video fills viewport, meetings sidebar */}
            <div className="flex-1 flex overflow-hidden gap-4 min-h-0">
                {/* Embedded conference room — fills available viewport height */}
                <div className="flex-1 glass-card neon-glow rounded-2xl border border-white/10 overflow-hidden flex flex-col min-w-0">
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-white/5 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-[#3aa3eb]/20 border border-[#3aa3eb]/30 shrink-0">
                                <VideoCameraIcon className="h-5 w-5 text-[#3aa3eb]" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-white font-bold text-base sm:text-lg truncate">Conference Room</h2>
                                <p className="text-gray-400 text-xs hidden sm:block">Join anytime — no link required</p>
                            </div>
                        </div>
                        <a
                            href={WHEREBY_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all shrink-0"
                            title="Open in new tab"
                        >
                            <ArrowsPointingOutIcon className="h-5 w-5" />
                        </a>
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

                {/* Meetings sidebar — desktop (persistent) */}
                <aside className="hidden lg:flex w-80 xl:w-96 flex-col glass-card rounded-2xl border border-white/10 overflow-hidden shrink-0">
                    <MeetingsSidebar
                        meetings={filteredMeetings}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        dateFilter={dateFilter}
                        setDateFilter={setDateFilter}
                        currentUserRole={currentUser?.role}
                        onJoin={handleJoinMeeting}
                        onViewDetails={handleViewDetails}
                        onDelete={handleDeleteMeeting}
                    />
                </aside>
            </div>

            {/* Mobile sidebar drawer */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="relative ml-auto w-full max-w-sm h-full glass-card rounded-l-2xl border border-white/10 overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
                            <h2 className="text-white font-bold">Meetings</h2>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <MeetingsSidebar
                            meetings={filteredMeetings}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            dateFilter={dateFilter}
                            setDateFilter={setDateFilter}
                            currentUserRole={currentUser?.role}
                            onJoin={(m) => { handleJoinMeeting(m); setSidebarOpen(false); }}
                            onViewDetails={(m) => { handleViewDetails(m); setSidebarOpen(false); }}
                            onDelete={handleDeleteMeeting}
                        />
                    </aside>
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

interface SidebarProps {
    meetings: Meeting[];
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    statusFilter: MeetingStatus | 'all';
    setStatusFilter: (v: MeetingStatus | 'all') => void;
    dateFilter: 'all' | 'upcoming' | 'past';
    setDateFilter: (v: 'all' | 'upcoming' | 'past') => void;
    currentUserRole?: string;
    onJoin: (m: Meeting) => void;
    onViewDetails: (m: Meeting) => void;
    onDelete: (m: Meeting) => void;
}

function MeetingsSidebar({
    meetings, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    dateFilter, setDateFilter, currentUserRole, onJoin, onViewDetails, onDelete
}: SidebarProps) {
    return (
        <>
            <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent transition-all"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] transition-all"
                    >
                        <option value="upcoming">Upcoming</option>
                        <option value="past">Past</option>
                        <option value="all">All Dates</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="live">Live</option>
                        <option value="processing">Processing</option>
                        <option value="ready">Ready</option>
                        <option value="shared">Shared</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                {meetings.length > 0 ? (
                    meetings.map(meeting => (
                        <div
                            key={meeting.id}
                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all overflow-hidden"
                        >
                            <div className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{meeting.title}</h3>
                                    <StatusPill status={meeting.status} />
                                </div>
                                <div className="flex flex-col gap-1.5 text-xs text-gray-400 mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <UsersIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{meeting.client?.name || 'No client'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            {meeting.meeting_date} at {meeting.meeting_time}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => onJoin(meeting)}
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#3aa3eb]/20 hover:bg-[#3aa3eb]/30 text-[#3aa3eb] border border-[#3aa3eb]/30 text-xs font-bold transition-all"
                                    >
                                        Join
                                    </button>
                                    <button
                                        onClick={() => onViewDetails(meeting)}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                                    >
                                        Details
                                    </button>
                                    {currentUserRole === 'admin' && (
                                        <button
                                            onClick={() => onDelete(meeting)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                                        >
                                            <XMarkIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center">
                        <VideoCameraSlashIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-gray-400">No meetings</h3>
                        <p className="text-gray-600 text-xs mt-1">Adjust filters or schedule one.</p>
                    </div>
                )}
            </div>
        </>
    );
}

function StatusPill({ status }: { status: MeetingStatus }) {
    const styles: Record<string, string> = {
        live: 'bg-red-500/20 text-red-300 border-red-500/40',
        scheduled: 'bg-[#3aa3eb]/20 text-[#3aa3eb] border-[#3aa3eb]/40',
        processing: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        ready: 'bg-green-500/20 text-green-300 border-green-500/40',
        shared: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border shrink-0 ${styles[status] || 'bg-white/10 text-gray-300 border-white/20'}`}>
            {status}
        </span>
    );
}
