import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Meeting } from '../../lib/supabase';

interface MeetingTranscriptTabProps {
    meeting: Meeting;
}

// Mock transcript data (since we don't have real AI yet)
const MOCK_TRANSCRIPT = [
    { time: '00:00', speaker: 'Admin', role: 'host', text: "Alright, let's get started. Thanks for joining everyone." },
    { time: '00:15', speaker: 'Client', role: 'client', text: "Thanks for having me. Excited to see the progress." },
    { time: '00:45', speaker: 'Admin', role: 'host', text: "We've made significant updates to the branding guidelines. I'll share my screen to walk you through them." },
    { time: '01:20', speaker: 'Client', role: 'client', text: "The color palette looks much better than last week. Can we make the blue a bit more vibrant?" },
    { time: '01:45', speaker: 'Admin', role: 'host', text: "Absolutely, we can adjust that saturation. What about the typography?" },
    { time: '02:10', speaker: 'Client', role: 'client', text: "Love the font choice. It feels modern but professional." },
    { time: '03:00', speaker: 'Admin', role: 'host', text: "Great. Now moving on to the website mockups..." },
];

export default function MeetingTranscriptTab({ }: MeetingTranscriptTabProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Use mock data for now if no transcript relation exists
    const transcriptEntries = MOCK_TRANSCRIPT;

    const filteredEntries = transcriptEntries.filter(entry =>
        entry.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.speaker.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[600px] flex flex-col glass-card rounded-2xl border border-white/10 overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search transcript..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            {/* Transcript List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {filteredEntries.length > 0 ? (
                    filteredEntries.map((entry, index) => (
                        <div key={index} className="flex gap-4 group hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                            <div className="w-12 pt-1 flex-shrink-0 text-xs font-mono text-gray-500 group-hover:text-blue-400 transition-colors">
                                {entry.time}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-sm font-bold ${entry.role === 'host' ? 'text-blue-300' : 'text-purple-300'}`}>
                                        {entry.speaker}
                                    </span>
                                    {entry.role === 'host' && (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 rounded border border-blue-500/20">HOST</span>
                                    )}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    {entry.text}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        No matches found for "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center text-xs text-gray-500">
                <span>Generated automatically</span>
                <button className="text-[#3aa3eb] hover:underline">Download Transcript</button>
            </div>
        </div>
    );
}
