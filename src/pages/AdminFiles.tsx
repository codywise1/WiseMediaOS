import React from 'react';
import { DocumentIcon, FolderIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const files = [
  { name: 'Brand Assets.zip', type: 'ZIP', size: '12.4 MB', updated: '2025-05-02', owner: 'Design Team', status: 'Ready' },
  { name: 'Client Contracts.pdf', type: 'PDF', size: '3.1 MB', updated: '2025-04-18', owner: 'Legal', status: 'Signed' },
  { name: 'Invoices Q1.xlsx', type: 'XLSX', size: '1.9 MB', updated: '2025-04-10', owner: 'Finance', status: 'Approved' },
  { name: 'Campaign Assets', type: 'Folder', size: '—', updated: '2025-04-03', owner: 'Marketing', status: 'In Review' },
];

const statusColors: Record<string, string> = {
  Ready: 'text-emerald-300 bg-emerald-500/10 border border-emerald-400/30',
  Signed: 'text-blue-300 bg-blue-500/10 border border-blue-400/30',
  Approved: 'text-indigo-200 bg-indigo-500/10 border border-indigo-400/30',
  'In Review': 'text-amber-200 bg-amber-500/10 border border-amber-400/30',
};

export default function AdminFiles() {
  return (
    <div className="p-6 space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#8AB5EB] font-medium">Admin / Files</p>
            <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: 'Integral CF, system-ui, sans-serif' }}>
              Internal library
            </h1>
            <p className="text-gray-400 mt-2 max-w-2xl">
              Central resources, contracts, and deliverables organized by team. Preview or download quickly.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:border-white/40 transition">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Upload file
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-white/5 border-b border-white/10">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Updated</div>
          <div className="col-span-1">Team</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-white/10">
          {files.map(file => (
            <div key={file.name} className="grid grid-cols-12 px-4 py-4 items-center text-sm text-white/90 hover:bg-white/5 transition">
              <div className="col-span-4 flex items-center gap-3">
                <span className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                  {file.type === 'Folder' ? <FolderIcon className="h-5 w-5 text-[#8AB5EB]" /> : <DocumentIcon className="h-5 w-5 text-[#8AB5EB]" />}
                </span>
                <div>
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-xs text-gray-400">Owner: {file.owner}</p>
                </div>
              </div>
              <div className="col-span-2 text-gray-300">{file.type}</div>
              <div className="col-span-2 text-gray-300">{file.size}</div>
              <div className="col-span-2 text-gray-300">{file.updated}</div>
              <div className="col-span-1 text-gray-300">{file.owner}</div>
              <div className="col-span-1 flex justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[file.status] || 'bg-white/5'}`}>
                  {file.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
