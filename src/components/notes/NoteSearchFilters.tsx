import {
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Client, Project } from '../../lib/supabase';

interface NoteSearchFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    category: string;
    onCategoryChange: (value: string) => void;
    clientId: string;
    onClientChange: (value: string) => void;
    projectId: string;
    onProjectChange: (value: string) => void;
    visibility: string;
    onVisibilityChange: (value: string) => void;
    clients: Client[];
    projects: Project[];
    onReset: () => void;
    resultsCount: number;
}

export default function NoteSearchFilters({
    searchQuery,
    onSearchChange,
    category,
    onCategoryChange,
    clientId,
    onClientChange,
    projectId,
    onProjectChange,
    visibility,
    onVisibilityChange,
    clients,
    projects,
    onReset,
    resultsCount
}: NoteSearchFiltersProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Search Filter */}
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Search</label>
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Type</label>
                <select
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
                >
                    <option value="all">All Types</option>
                    <option value="idea">Idea</option>
                    <option value="meeting">Meeting</option>
                    <option value="sales_call">Sales Call</option>
                    <option value="sop">SOP</option>
                    <option value="task">Task</option>
                    <option value="general">General</option>
                </select>
            </div>

            {/* Client Filter */}
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Client</label>
                <select
                    value={clientId}
                    onChange={(e) => onClientChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
                >
                    <option value="all">All Clients</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Project Filter */}
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Project</label>
                <select
                    value={projectId}
                    onChange={(e) => onProjectChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
                >
                    <option value="all">All Projects</option>
                    {projects.filter((p: Project) => clientId === 'all' || p.client_id === clientId).map((p: Project) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Visibility Filter */}
            {/* <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Visibility</label>
                <select
                    value={visibility}
                    onChange={(e) => onVisibilityChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#3aa3eb] focus:border-transparent"
                >
                    <option value="all">All Visibility</option>
                    <option value="internal">Internal Only</option>
                    <option value="client_visible">Shared with Client</option>
                </select>
            </div> */}

            {/* Active filters display */}
            {(searchQuery || category !== 'all' || clientId !== 'all' || projectId !== 'all' || visibility !== 'all') && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-5 flex flex-wrap items-center gap-2 mt-2 text-sm">
                    <span className="text-gray-400">Active filters:</span>
                    {searchQuery && (
                        <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                            Search: {searchQuery}
                        </span>
                    )}
                    {category !== 'all' && (
                        <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300 capitalize">
                            Category: {category.replace('_', ' ')}
                        </span>
                    )}
                    {clientId !== 'all' && (
                        <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                            Client: {clients.find((c: Client) => c.id === clientId)?.name}
                        </span>
                    )}
                    {projectId !== 'all' && (
                        <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                            Project: {projects.find((p: Project) => p.id === projectId)?.name}
                        </span>
                    )}
                    {visibility !== 'all' && (
                        <span className="px-2 py-1 bg-slate-700 rounded-md text-gray-300">
                            Visibility: {visibility === 'client_visible' ? 'Shared' : 'Internal'}
                        </span>
                    )}
                    <button
                        onClick={onReset}
                        className="text-[#3aa3eb] hover:text-blue-300 font-medium shrink-glow-button"
                    >
                        Clear all
                    </button>
                    <span className="ml-auto text-xs font-bold text-[#3aa3eb] uppercase tracking-widest bg-[#3aa3eb]/10 px-3 py-1 rounded-full">
                        {resultsCount} {resultsCount === 1 ? 'Note' : 'Notes'} Found
                    </span>
                </div>
            )}
        </div>
    );
}

