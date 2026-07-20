import { useState, useRef, useCallback } from 'react';
import { UploadCloud, Link2, FileText, X, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';

export interface DownloadFile {
  id: string;
  name: string;
  url: string;
  size?: number;
  type: 'upload' | 'url';
  file_type?: string;
}

interface Props {
  bucket?: string;
  folder?: string;
  value: DownloadFile[];
  onChange: (files: DownloadFile[]) => void;
  accept?: string;
  label?: string;
  hint?: string;
}

export default function DownloadUploader({
  bucket = 'files',
  folder = 'downloads',
  value = [],
  onChange,
  accept = '*/*',
  label = 'Downloadable Files',
  hint = 'Drag files here or click to browse. You can also paste a URL to an external download (e.g. another creator\'s product).',
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => uploadFile(file));
  }, []);

  async function uploadFile(file: File) {
    if (!isSupabaseAvailable()) {
      const localFile: DownloadFile = {
        id: `local-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        size: file.size,
        type: 'upload',
        file_type: file.type,
      };
      onChange([...value, localFile]);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
      const { error: uploadError } = await supabase!.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase!.storage.from(bucket).getPublicUrl(fileName);
      const newFile: DownloadFile = {
        id: fileName,
        name: file.name,
        url: data.publicUrl,
        size: file.size,
        type: 'upload',
        file_type: file.type,
      };
      onChange([...value, newFile]);
    } catch (e) {
      console.error('Upload error:', e);
      alert('Failed to upload file: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    if (!urlInput.trim()) return;
    const name = urlName.trim() || urlInput.split('/').pop() || 'External Download';
    const newFile: DownloadFile = {
      id: `url-${Date.now()}`,
      name,
      url: urlInput.trim(),
      type: 'url',
    };
    onChange([...value, newFile]);
    setUrlInput('');
    setUrlName('');
  }

  function removeFile(id: string) {
    onChange(value.filter(f => f.id !== id));
  }

  function formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">{label}</label>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${isDragging
          ? 'border-[#3AA3EB] bg-[#3AA3EB]/10'
          : 'border-white/15 bg-black/20 hover:border-white/25 hover:bg-black/30'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files || []);
            files.forEach(f => uploadFile(f));
            e.target.value = '';
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 size={24} className="text-[#3AA3EB] animate-spin" />
            <p className="text-gray-400 text-sm">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-12 h-12 rounded-2xl bg-[#3AA3EB]/15 flex items-center justify-center">
              <UploadCloud size={22} className="text-[#3AA3EB]" />
            </div>
            <p className="text-white text-sm font-medium">
              {isDragging ? 'Drop to upload' : 'Drag & drop files here'}
            </p>
            <p className="text-gray-500 text-xs">or click to browse</p>
          </div>
        )}
      </div>

      {/* URL field */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={14} className="text-gray-500 flex-shrink-0" />
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">External Download URL</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={urlName}
            onChange={e => setUrlName(e.target.value)}
            className="sm:w-40 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
            placeholder="Display name"
          />
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            className="flex-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/30 focus:outline-none transition-all"
            placeholder="https://example.com/file.zip"
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!urlInput.trim()}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download size={14} /> Add
          </button>
        </div>
      </div>

      {hint && <p className="text-gray-500 text-xs mt-2 leading-relaxed">{hint}</p>}

      {/* File list */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          {value.map(file => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${file.type === 'url' ? 'bg-purple-500/15' : 'bg-emerald-500/15'
                }`}>
                {file.type === 'url' ? <Link2 size={16} className="text-purple-300" /> : <FileText size={16} className="text-emerald-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  {file.type === 'url' ? (
                    <span className="flex items-center gap-1"><Link2 size={10} /> External link</span>
                  ) : (
                    <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" /> Uploaded{file.size ? ` · ${formatSize(file.size)}` : ''}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
