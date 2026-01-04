import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileRecord, filesService, FileStatus, FileVisibility } from '../lib/supabase';
import { formatAppDate } from '../lib/dateFormat';
import { fileStatusColors } from '../lib/statusColors';

export default function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleVisibilityChange = async (newVisibility: FileVisibility) => {
    if (!file) return;
    try {
      const updated = await filesService.update(file.id, { visibility: newVisibility });
      if (updated) setFile(updated);
    } catch (error) {
      console.error('Error updating visibility:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading file...</div>;
  }

  if (!file) {
    return <div className="p-8">File not found.</div>;
  }

  const isImage = file.content_type?.startsWith('image/');
  const isVideo = file.content_type?.startsWith('video/');
  const isAudio = file.content_type?.startsWith('audio/');
  const isPdf = file.content_type === 'application/pdf';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Preview */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigate('/files')}
                  className="text-blue-300 hover:text-blue-200 flex items-center gap-2"
                >
                  ← Back to Files
                </button>
                <div className="flex gap-2">
                  <button className="btn-secondary">Download</button>
                  <button className="btn-primary">Share</button>
                </div>
              </div>

              <div className="aspect-video bg-white/5 rounded-xl overflow-hidden mb-6">
                {isImage && previewUrl && (
                  <img src={previewUrl} alt={file.filename} className="w-full h-full object-contain" />
                )}
                {isVideo && previewUrl && (
                  <video controls className="w-full h-full">
                    <source src={previewUrl} type={file.content_type || undefined} />
                  </video>
                )}
                {isAudio && previewUrl && (
                  <div className="flex items-center justify-center h-full">
                    <audio controls>
                      <source src={previewUrl} type={file.content_type || undefined} />
                    </audio>
                  </div>
                )}
                {isPdf && previewUrl && (
                  <iframe src={previewUrl} className="w-full h-full" />
                )}
                {!isImage && !isVideo && !isAudio && !isPdf && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📄</div>
                      <div className="text-gray-400">Preview not available</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Version History */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Version History</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="font-medium text-white">Version 1</div>
                      <div className="text-sm text-gray-400">{formatAppDate(file.created_at)}</div>
                    </div>
                    <button className="text-blue-300 hover:text-blue-200">Restore</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Panel */}
          <div className="space-y-6">
            {/* File Info */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">{file.filename}</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-2">{file.content_type || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Size:</span>
                  <span className="text-white ml-2">
                    {file.size_bytes ? `${(file.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Owner:</span>
                  <span className="text-white ml-2">{file.owner_id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white ml-2">{formatAppDate(file.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Updated:</span>
                  <span className="text-white ml-2">{formatAppDate(file.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Linked Context */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Linked Context</h3>
              <div className="space-y-3">
                {file.client && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <div className="font-medium text-white">{file.client.name}</div>
                      <div className="text-sm text-gray-400">Client</div>
                    </div>
                  </div>
                )}
                {file.project && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      📁
                    </div>
                    <div>
                      <div className="font-medium text-white">{file.project.name}</div>
                      <div className="text-sm text-gray-400">Project</div>
                    </div>
                  </div>
                )}
                {file.meeting && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      📹
                    </div>
                    <div>
                      <div className="font-medium text-white">{file.meeting.title}</div>
                      <div className="text-sm text-gray-400">Meeting</div>
                    </div>
                    <button className="text-blue-300 hover:text-blue-200 ml-auto">View Recording</button>
                  </div>
                )}
              </div>
            </div>

            {/* Sharing Controls */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sharing</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Visibility</label>
                  <select
                    value={file.visibility}
                    onChange={(e) => handleVisibilityChange(e.target.value as FileVisibility)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="private">Private</option>
                    <option value="shared">Shared with Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Status</label>
                  <select
                    value={file.status}
                    onChange={(e) => handleStatusChange(e.target.value as FileStatus)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="awaiting_client">Awaiting Client</option>
                    <option value="approved">Approved</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${fileStatusColors[file.status]}`}>
                  {file.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>

            {/* AI Actions */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">AI Actions</h3>
              <div className="space-y-2">
                <button className="w-full btn-secondary text-left">Summarize Contents</button>
                <button className="w-full btn-secondary text-left">Detect Scope Impact</button>
                <button className="w-full btn-secondary text-left">Suggest Next Action</button>
                <button className="w-full btn-secondary text-left">Generate Client Update</button>
              </div>
            </div>

            {/* Audit Timeline */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Audit Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <div>
                    <div className="text-sm text-white">Uploaded</div>
                    <div className="text-xs text-gray-400">{formatAppDate(file.created_at)}</div>
                  </div>
                </div>
                {file.visibility === 'shared' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                    <div>
                      <div className="text-sm text-white">Shared</div>
                      <div className="text-xs text-gray-400">{formatAppDate(file.updated_at)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
