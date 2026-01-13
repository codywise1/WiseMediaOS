import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileRecord,
  filesService,
  FileStatus
} from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { fileStatusColors } from '../lib/statusColors';
import {
  ArrowLeftIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  UserIcon,
  FolderIcon,
  VideoCameraIcon,
  ClockIcon,
  CalendarDaysIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';

export default function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadFile();
  }, [id]);

  const loadFile = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await filesService.getById(id);
      setFile(data);
      if (data) {
        const url = await filesService.getSignedUrl(data.path);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: FileStatus) => {
    if (!file) return;
    try {
      const updated = await filesService.update(file.id, { status: newStatus });
      if (updated) setFile(updated);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (!file) return;
    try {
      await filesService.delete(file);
      navigate('/files');
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3aa3eb]"></div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="glass-card rounded-3xl p-20 text-center border border-white/10 m-8">
        <DocumentIcon className="h-16 w-16 text-gray-700 mx-auto mb-6" />
        <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Integral CF, sans-serif' }}>File not found</h3>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">The document you are looking for might have been moved or deleted.</p>
        <button
          onClick={() => navigate('/files')}
          className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white tracking-widest hover:bg-white/10 transition-all"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const isImage = file.content_type?.startsWith('image/');
  const isVideo = file.content_type?.startsWith('video/');
  const isAudio = file.content_type?.startsWith('audio/');
  const isPdf = file.content_type === 'application/pdf';

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/files')}
          className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors group"
        >
          <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black tracking-wider uppercase">Back to Assets</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Main Title Card */}
          <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Portal Visibility</span>
              <div
                onClick={async () => {
                  try {
                    const newShareState = !file.is_shared_with_client;
                    const updated = await filesService.toggleShare(file.id, newShareState);
                    if (updated) setFile(updated);
                  } catch (err) {
                    console.error('Error toggling share:', err);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${file.is_shared_with_client ? 'bg-emerald-500/40 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/5 border border-white/10'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${file.is_shared_with_client ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight" style={{ fontFamily: 'Integral CF, sans-serif' }}>
                {file.filename}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${fileStatusColors[file.status]}`}>
                  {file.status.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/70 bg-white/5 border border-white/10">
                  {file.content_type?.split('/')[1] || 'Asset'}
                </span>
                {file.is_shared_with_client && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">
                    Shared with Client
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Preview Container */}
          <div className="glass-card rounded-[32px] border border-white/10 overflow-hidden bg-black/20 relative">
            <div className="aspect-video flex items-center justify-center p-4">
              {isImage && previewUrl && (
                <img src={previewUrl} alt={file.filename} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
              )}
              {isVideo && previewUrl && (
                <video controls className="max-w-full max-h-full shadow-2xl rounded-xl">
                  <source src={previewUrl} type={file.content_type || undefined} />
                </video>
              )}
              {isAudio && previewUrl && (
                <div className="bg-white/5 p-12 rounded-full border border-white/10">
                  <audio controls>
                    <source src={previewUrl} type={file.content_type || undefined} />
                  </audio>
                </div>
              )}
              {isPdf && previewUrl && (
                <iframe src={previewUrl} className="w-full h-[600px] border-none" title="PDF Preview" />
              )}
              {!isImage && !isVideo && !isAudio && !isPdf && (
                <div className="text-center space-y-4">
                  <DocumentIcon className="h-20 w-20 text-gray-700 mx-auto" />
                  <div>
                    <p className="text-white font-bold" style={{ fontFamily: 'Integral CF, sans-serif' }}>Preview Unavailable</p>
                    <p className="text-gray-500 text-xs">Standard {file.content_type || 'Asset'} format</p>
                  </div>
                  <button
                    onClick={() => window.open(previewUrl || '#', '_blank')}
                    className="btn-header-glass px-6 py-2 text-[10px]"
                  >
                    <span className="btn-text-glow">Download File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="glass-card rounded-[24px] p-6 border border-white/10 shadow-xl">
            <h2 className="text-[10px] font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2">
              <CommandLineIcon className="h-4 w-4 text-[#3aa3eb]" />
              Encoded Metadata
            </h2>
            <div className="space-y-4">
              <MetaItem label="Size" value={file.size_bytes ? `${(file.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'} icon={CommandLineIcon} />
              <MetaItem label="Owner" value="Platform Admin" icon={UserIcon} />
              <MetaItem label="Stored" value={formatAppDate(file.created_at)} icon={CalendarDaysIcon} />
              <MetaItem label="Last Edit" value={formatAppDate(file.updated_at)} icon={ClockIcon} />
            </div>
          </div>

          {/* Actions Card */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-center gap-4">
            <button
              onClick={() => window.open(previewUrl || '#', '_blank')}
              className="p-3 rounded-full bg-[#3aa3eb]/10 text-[#3aa3eb] hover:bg-[#3aa3eb]/20 border border-[#3aa3eb]/20 transition-all"
              title="Download asset"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
            {profile?.role === 'admin' && (
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="p-3 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all"
                title="Delete Resource"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Linked Context Card */}
          <div className="glass-card rounded-[24px] p-6 border border-white/10">
            <h2 className="text-[10px] font-black text-white tracking-widest uppercase mb-6">Linked Intelligence</h2>
            <div className="space-y-2">
              {file.client && (
                <LinkedItem label="Client" value={file.client.name} icon={UserIcon} />
              )}
              {file.project && (
                <LinkedItem label="Project" value={file.project.name} icon={FolderIcon} to={`/projects/${file.project_id}`} />
              )}
              {file.meeting && (
                <LinkedItem label="Meeting" value={file.meeting.title} icon={VideoCameraIcon} to={`/meetings/${file.meeting_id}`} />
              )}
              {!file.client && !file.project && !file.meeting && (
                <p className="text-[10px] text-white/50 italic">No external context linked.</p>
              )}
            </div>
          </div>

          {/* Configuration Card */}
          <div className="glass-card rounded-[24px] p-6 border border-white/10">
            <h2 className="text-[10px] font-black text-white tracking-widest uppercase mb-6 text-center">Lifecycle Status</h2>
            <div className="space-y-4">
              <select
                value={file.status}
                onChange={(e) => handleStatusChange(e.target.value as FileStatus)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#3aa3eb]/50 transition-all appearance-none text-center"
              >
                <option value="draft">Draft Phase</option>
                <option value="in_review">Awaiting Review</option>
                <option value="awaiting_client">Sent to Client</option>
                <option value="approved">Asset Approved</option>
                <option value="archived">Archived Asset</option>
              </select>

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => window.open(previewUrl || '#', '_blank')}
                  className="w-full btn-header-glass py-3"
                >
                  <span className="btn-text-glow">Generate Signed Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Resource"
        message={`Are you sure you want to permanently delete "${file.filename}"? This action will remove the file and all associated metadata.`}
      />
    </div>
  );
}

function MetaItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-2 text-white/50 font-bold uppercase tracking-widest">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}

function LinkedItem({ label, value, icon: Icon, to }: any) {
  const content = (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
      <div className="p-2 bg-white/5 rounded-lg group-hover:bg-[#3aa3eb]/20 transition-colors">
        <Icon className="h-4 w-4 text-gray-500 group-hover:text-[#3aa3eb]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">{label}</p>
        <p className="text-[11px] font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
