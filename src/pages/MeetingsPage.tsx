import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    VideoCameraIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    VideoCameraSlashIcon,
    ClipboardDocumentCheckIcon,
    CheckCircleIcon,
    ShareIcon
} from '@heroicons/react/24/outline';
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

export default function MeetingsPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

    const currentUser = profile ? {
        id: profile.id,
        role: profile.role,
        name: profile.name
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
        console.log('[MeetingsPage] handleJoinMeeting called', { id: meeting.id, status: meeting.status });

        if (!meeting.id) {
            console.error('[MeetingsPage] Cannot join meeting: No meeting ID provided.');
            return;
        }

        // For both 'live' and 'scheduled' meetings, we navigate to our internal live view
        if (meeting.status === 'live' || meeting.status === 'scheduled') {
            const targetPath = `/meetings/live/${meeting.id}`;
            console.log('[MeetingsPage] Navigating to:', targetPath);
            navigate(targetPath);
        } else if (meeting.meeting_url) {
            console.log('[MeetingsPage] Opening external URL:', meeting.meeting_url);
            window.open(meeting.meeting_url, '_blank');
        } else {
            console.warn('[MeetingsPage] Join clicked for meeting with status:', meeting.status, 'and no URL.');
        }
    };

    const handleViewDetails = (meeting: Meeting) => {
        console.log('[MeetingsPage] handleViewDetails called', { id: meeting.id });
        if (meeting.id) {
            navigate(`/meetings/${meeting.id}`);
        }
    };

    const handleShareMeeting = async (meeting: Meeting) => {
        // Sharing logic would go here - likely opening a share modal
        console.log('Sharing meeting:', meeting.id);
    };

    const handleDeleteMeeting = async (meeting: Meeting) => {
        if (window.confirm('Are you sure you want to delete this meeting?')) {
            try {
                await meetingService.delete(meeting.id);
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
        const matchesClient = clientFilter === 'all' || meeting.client_id === clientFilter;
        const matchesProject = projectFilter === 'all' || meeting.project_id === projectFilter;

        let matchesDate = true;
        const now = new Date();
        const meetingDate = new Date(`${meeting.meeting_date}T${meeting.meeting_time}`);

        if (dateFilter === 'upcoming') {
            matchesDate = meetingDate >= now || meeting.status === 'live';
        } else if (dateFilter === 'past') {
            matchesDate = meetingDate < now && meeting.status !== 'live';
        }

        return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesDate;
    });

    // Calculate stats
    const stats = {
        upcoming: meetings.filter(m => {
            const date = new Date(`${m.meeting_date}T${m.meeting_time}`);
            return date >= new Date() && m.status !== 'cancelled';
        }).length,
        awaitingSummary: meetings.filter(m => m.status === 'processing' || (m.status === 'ready' && !m.summary_id)).length,
        completed: meetings.filter(m => m.status === 'ready' || m.status === 'shared').length,
        shared: meetings.filter(m => m.status === 'shared').length
    };

    if (loading) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight font-display">
                        MEETINGS
                    </h1>
                    <p className="text-gray-400 mt-1">Manage calls, recordings, and transcripts</p>
                </div>
                <div className="flex items-center gap-3">
                    {filteredMeetings.some(m => m.status === 'live') && (
                        <button
                            onClick={() => {
                                const liveMeeting = filteredMeetings.find(m => m.status === 'live');
                                if (liveMeeting) handleJoinMeeting(liveMeeting);
                            }}
                            className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full font-bold uppercase tracking-wide transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse flex items-center gap-2"
                        >
                            <VideoCameraIcon className="h-5 w-5" />
                            Join Live Now
                        </button>
                    )}
                    <button
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="btn-primary shrink-glow-button px-6 py-2.5 rounded-full font-medium"
                    >
                        Schedule Meeting
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Upcoming"
                    count={stats.upcoming}
                    icon={VideoCameraIcon}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <StatCard
                    label="Awaiting Summary"
                    count={stats.awaitingSummary}
                    icon={ClipboardDocumentCheckIcon}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
                <StatCard
                    label="Completed"
                    count={stats.completed}
                    icon={CheckCircleIcon}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <StatCard
                    label="Shared with Client"
                    count={stats.shared}
                    icon={ShareIcon}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                />
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
                <div className="flex flex-wrap gap-3">
                    <FilterSelect
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        options={[
                            { value: 'upcoming', label: 'Upcoming' },
                            { value: 'past', label: 'Past' },
                            { value: 'all', label: 'All Dates' }
                        ]}
                    />
                    <FilterSelect
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'scheduled', label: 'Scheduled' },
                            { value: 'live', label: 'Live' },
                            { value: 'processing', label: 'Processing' },
                            { value: 'ready', label: 'Ready' },
                            { value: 'shared', label: 'Shared' }
                        ]}
                    />
                    <FilterSelect
                        value={clientFilter}
                        onChange={(e) => setClientFilter(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Clients' },
                            ...clients.map(c => ({ value: c.id, label: c.name }))
                        ]}
                    />
                </div>
            </div>

            {/* Meetings Grid */}
            {filteredMeetings.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMeetings.map(meeting => (
                        <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            currentUserRole={currentUser?.role}
                            onJoin={handleJoinMeeting}
                            onViewDetails={handleViewDetails}
                            onShare={handleShareMeeting}
                            onDelete={handleDeleteMeeting}
                        />
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
                    <VideoCameraSlashIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No meetings found</h3>
                    <p className="text-gray-400">Try adjusting your filters or schedule a new meeting.</p>
                </div>
            )}

            {/* Schedule Modal */}
            <ScheduleMeetingModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSave={loadData}
                currentUser={currentUser}
            />
        </div>
    );
}

function StatCard({ label, count, icon: Icon, color, bg }: any) {
    return (
        <div className="glass-card rounded-xl p-5 border border-white/10 flex items-center gap-4 group hover:border-white/20 transition-all">
            <div className={`p-3 rounded-lg ${bg} ${color} group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-white mt-0.5">{count}</p>
            </div>
        </div>
    );
}

function FilterSelect({ value, onChange, options }: any) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-8 text-sm text-white focus:outline-none focus:border-blue-500/50 cursor-pointer hover:bg-white/10 transition-colors min-w-[140px]"
            >
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
            </div>
        </div>
    );
}
