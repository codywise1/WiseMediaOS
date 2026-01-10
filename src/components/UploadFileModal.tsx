import { useState, useRef, ChangeEvent } from 'react';
import { FileRecord, filesService, Client, Project, Appointment } from '../lib/supabase';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: FileRecord) => void;
  clients: Client[];
  projects: Project[];
  meetings: Appointment[];
}

export default function UploadFileModal({ isOpen, onClose, onUpload, clients, projects, meetings }: UploadFileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkedClient, setLinkedClient] = useState<string>('');
  const [linkedProject, setLinkedProject] = useState<string>('');
  const [linkedMeeting, setLinkedMeeting] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const [customFilename, setCustomFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCustomFilename(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      const uploadedFile = await filesService.upload(selectedFile, {
        client_id: linkedClient || undefined,
        project_id: linkedProject || undefined,
        meeting_id: linkedMeeting || undefined,
        visibility,
        status: 'draft',
        filename: customFilename || undefined,
      });
      onUpload(uploadedFile);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setLinkedClient('');
    setLinkedProject('');
    setLinkedMeeting('');
    setVisibility('private');
    setCustomFilename('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Upload File</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 border-2 border-dashed border-gray-500 rounded-xl text-center hover:border-blue-400 transition"
            >
              {selectedFile ? (
                <div>
                  <div className="text-white font-medium">{selectedFile.name}</div>
                  <div className="text-gray-400 text-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl mb-2">📁</div>
                  <div className="text-gray-400">Click to select file</div>
                </div>
              )}
            </button>
            {/* File Name (Editable) */}
            {selectedFile && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3aa3eb]"
                  placeholder="Enter filename"
                />
              </div>
            )}
          </div>

          {/* Link to Context */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Link to Context (Optional)
            </label>
            <div className="space-y-3">
              <select
                value={linkedClient}
                onChange={(e) => setLinkedClient(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">No Client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>

              <select
                value={linkedProject}
                onChange={(e) => setLinkedProject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">No Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>

              <select
                value={linkedMeeting}
                onChange={(e) => setLinkedMeeting(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">No Meeting</option>
                {meetings.map(meeting => (
                  <option key={meeting.id} value={meeting.id}>{meeting.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'shared')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="private">Private</option>
              <option value="shared">Shared with Client</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 btn-primary"
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
