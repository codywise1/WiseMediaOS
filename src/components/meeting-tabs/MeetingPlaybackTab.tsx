import React from 'react';
import {
    PlayIcon,
    SpeakerWaveIcon,
    ArrowsPointingOutIcon,
    ForwardIcon,
    BackwardIcon
} from '@heroicons/react/24/solid';
import { Meeting } from '../../lib/supabase';

interface MeetingPlaybackTabProps {
    meeting: Meeting;
}

export default function MeetingPlaybackTab({ meeting }: MeetingPlaybackTabProps) {
    const hasRecording = !!meeting.recording_id || meeting.status === 'ready' || meeting.status === 'shared';
    const isProcessing = meeting.status === 'processing';

    if (!hasRecording && !isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-2xl border border-white/10">
                <div className="p-4 bg-white/5 rounded-full mb-4">
                    <PlayIcon className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">No Recording Available</h3>
                <p className="text-gray-400">This meeting was not recorded.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2 space-y-4">
                <div className="aspect-video bg-black rounded-2xl border border-white/10 relative overflow-hidden group">
                    {isProcessing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                            <p className="text-gray-400">Processing recording...</p>
                        </div>
                    ) : (
                        <>
                            {/* Mock Video Content */}
                            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                                        {meeting.client?.name?.charAt(0) || 'C'}
                                    </div>
                                    <p className="text-gray-500">Video Playback Mock</p>
                                </div>
                            </div>

                            {/* Controls Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Progress Bar */}
                                <div className="w-full h-1 bg-white/20 rounded-full mb-4 cursor-pointer hover:h-1.5 transition-all">
                                    <div className="w-1/3 h-full bg-[#3aa3eb] rounded-full relative">
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button className="text-white hover:text-blue-400 transition-colors">
                                            <PlayIcon className="h-6 w-6" />
                                        </button>
                                        <div className="flex items-center gap-2 text-white/50 text-sm">
                                            <span className="text-white">12:30</span>
                                            <span>/</span>
                                            <span>45:00</span>
                                        </div>
                                        <button className="text-white/70 hover:text-white transition-colors">
                                            <BackwardIcon className="h-5 w-5" />
                                        </button>
                                        <button className="text-white/70 hover:text-white transition-colors">
                                            <ForwardIcon className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 group/vol">
                                            <SpeakerWaveIcon className="h-5 w-5 text-white/70" />
                                            <div className="w-20 h-1 bg-white/20 rounded-full">
                                                <div className="w-2/3 h-full bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                        <button className="px-2 py-1 bg-white/10 rounded text-xs text-white font-medium hover:bg-white/20">
                                            1x
                                        </button>
                                        <button className="text-white/70 hover:text-white transition-colors">
                                            <ArrowsPointingOutIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Timeline Markers */}
                {!isProcessing && (
                    <div className="p-4 glass-card rounded-xl border border-white/10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Key Moments</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {[
                                { time: '02:15', label: 'Intro' },
                                { time: '15:30', label: 'Demo' },
                                { time: '32:45', label: 'Q&A' },
                                { time: '41:00', label: 'Next Steps' }
                            ].map((marker, i) => (
                                <button
                                    key={i}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                                >
                                    <span className="font-mono text-blue-400 mr-2">{marker.time}</span>
                                    {marker.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Participants</h3>
                    <div className="space-y-4">
                        {meeting.participants.map((p, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{p.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{p.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4">Meeting Info</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date</span>
                            <span className="text-gray-300">{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Duration</span>
                            <span className="text-gray-300">{meeting.duration_minutes} mins</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Platform</span>
                            <span className="text-gray-300 capitalize">{meeting.location || 'WiseVideo'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
