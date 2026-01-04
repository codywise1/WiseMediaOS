import {
    MagnifyingGlassIcon,
    FunnelIcon,
    XMarkIcon,
    ChevronDownIcon
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
        <div className="space-y-4">
            {/* Search and Results Count */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search notes, tags, content..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3aa3eb]/50 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <XMarkIcon className="h-4 w-4 text-gray-500" />
                        </button>
                    )}
                </div>
                <div className="px-4 py-2 bg-[#3aa3eb]/10 border border-[#3aa3eb]/20 rounded-xl">
                    <p className="text-[10px] font-bold text-[#3aa3eb] uppercase tracking-widest">
                        {resultsCount} {resultsCount === 1 ? 'Note' : 'Notes'} Found
                    </p>
                </div>
            </div>

            {/* Filters Row */}
            <div className="glass-card rounded-2xl border border-white/10 p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 border-r border-white/10 mr-1">
                    <FunnelIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filters</span>
                </div>

                {/* Category Filter */}
                <FilterDropdown
                    value={category}
                    onChange={onCategoryChange}
                    options={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'idea', label: 'Idea' },
                        { value: 'meeting', label: 'Meeting' },
                        { value: 'sales_call', label: 'Sales Call' },
                        { value: 'sop', label: 'SOP' },
                        { value: 'task', label: 'Task' },
                        { value: 'general', label: 'General' }
                    ]}
                />

                {/* Visibility Filter */}
                <FilterDropdown
                    value={visibility}
                    onChange={onVisibilityChange}
                    options={[
                        { value: 'all', label: 'All Visibility' },
                        { value: 'internal', label: 'Internal Only' },
                        { value: 'client_visible', label: 'Shared with Client' }
                    ]}
                />

                {/* Client Filter */}
                <FilterDropdown
                    value={clientId}
                    onChange={onClientChange}
                    options={[
                        { value: 'all', label: 'All Clients' },
                        ...clients.map(c => ({ value: c.id, label: c.name }))
                    ]}
                />

                {/* Project Filter */}
                <FilterDropdown
                    value={projectId}
                    onChange={onProjectChange}
                    options={[
                        { value: 'all', label: 'All Projects' },
                        ...projects.filter(p => clientId === 'all' || p.client_id === clientId).map(p => ({ value: p.id, label: p.name }))
                    ]}
                />

                <button
                    onClick={onReset}
                    className="ml-auto px-4 py-2 hover:bg-white/5 rounded-xl text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-all"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
}

function FilterDropdown({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) {

    return (
        <div className="relative group">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2 pr-10 text-xs font-bold text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all cursor-pointer min-w-[140px]"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0f172a] text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none group-hover:text-gray-300 transition-colors" />
        </div>
    );
}
