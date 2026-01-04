 
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DocumentIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatAppDate } from '../lib/dateFormat';
import { DocumentRecord, documentsService } from '../lib/supabase';
import { adminFileStatusColors } from '../lib/statusColors';

export default function AdminFiles() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
  };

  const getFileType = (doc: DocumentRecord) => {
    if (doc.content_type && doc.content_type.includes('/')) {
      return doc.content_type.split('/')[1]?.toUpperCase() || 'FILE';
    }
    const ext = doc.filename.split('.').pop();
    return (ext ? ext.toUpperCase() : 'FILE');
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsService.list();
      setDocuments(data);
    } catch (e) {
      console.error('Error loading documents:', e);
      alert('Error loading documents. Please try again.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (doc: DocumentRecord, nextStatus: string) => {
    try {
      setUpdatingId(doc.id);
      const updated = await documentsService.update(doc.id, { status: nextStatus });
      if (updated) {
        setDocuments(prev => prev.map(d => (d.id === doc.id ? updated : d)));
      }
    } catch (err) {
      console.error('Error updating document status:', err);
      alert('Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setLoading(true);
      await documentsService.upload(file, { status: 'Ready' });
      await loadDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Upload failed. Please try again.');
      setLoading(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      const url = await documentsService.getSignedUrl(doc.path, 120);
      if (!url) {
        alert('Download not available in demo mode.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error creating signed url:', err);
      alert('Could not generate download link.');
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    const confirmed = window.confirm(`Delete "${doc.filename}"?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      await documentsService.delete({ id: doc.id, path: doc.path });
      await loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Delete failed.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card neon-glow rounded-2xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold gradient-text mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Files</h1>
            <p className="text-gray-300">Central resources, contracts, and deliverables organized by team</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
          <button
            onClick={handleUploadClick}
            className="btn-primary text-white font-medium flex items-center justify-center space-x-2 shrink-glow-button shrink-0 w-full sm:w-auto"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Upload file</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-white/5 border-b border-white/10">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Updated</div>
          <div className="col-span-1">Team</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-white/10">
          {loading && (
            <div className="px-4 py-6 text-sm text-gray-400">Loading files...</div>
          )}

          {!loading && documents.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-400">No files yet.</div>
          )}

          {!loading && documents.map(doc => (
            <div
              key={doc.id}
              className="flex flex-col gap-3 px-4 py-4 text-sm text-white/90 hover:bg-white/5 transition sm:grid sm:grid-cols-12 sm:gap-0 sm:items-center"
            >
              <div className="flex items-center gap-3 min-w-0 sm:col-span-4">
                <span className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  <DocumentIcon className="h-5 w-5 text-[#8AB5EB]" />
                </span>
                <div className="min-w-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="font-semibold truncate text-left hover:text-white"
                    title="Download"
                  >
                    {doc.filename}
                  </button>
                  <p className="text-xs text-gray-400">Owner: {doc.created_by || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-300 sm:contents">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 sm:hidden">Type</span>
                  <span className="text-sm sm:text-gray-300">{getFileType(doc)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 sm:hidden">Size</span>
                  <span className="text-sm sm:text-gray-300">{formatBytes(doc.size_bytes)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 sm:hidden">Updated</span>
                  <span className="text-sm sm:text-gray-300">{formatAppDate(doc.updated_at)}</span>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-1">
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 sm:hidden">Team</span>
                  <span className="text-sm sm:text-gray-300">{doc.owner_team || '—'}</span>
                </div>
              </div>

              <div className="flex justify-start sm:col-span-1 sm:justify-end">
                <div className="flex items-center gap-2">
                  <select
                    value={doc.status || 'Ready'}
                    onChange={(e) => handleStatusChange(doc, e.target.value)}
                    disabled={updatingId === doc.id}
                    className={`px-3 py-1 rounded-full text-xs font-semibold bg-transparent ${adminFileStatusColors[doc.status || 'Ready'] || 'bg-white/5'} border border-white/10`}
                    title="Update status"
                  >
                    <option value="Ready">Ready</option>
                    <option value="In Review">In Review</option>
                    <option value="Signed">Signed</option>
                    <option value="Approved">Approved</option>
                  </select>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-blue-200 hover:text-red-200 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
