// Shared status colors for consistent UI across the app
import { FileStatus, MeetingStatus } from './supabase';

export const fileStatusColors: Record<FileStatus, string> = {
  draft: 'text-[#3ba3ea] bg-[#3ba3ea]/10 border border-[#3ba3ea]/30',
  in_review: 'text-[#e8ea3b] bg-[#e8ea3b]/10 border border-[#e8ea3b]/30',
  awaiting_client: 'text-[#ea3b3b] bg-[#ea3b3b]/10 border border-[#ea3b3b]/30',
  approved: 'text-[#40ac40] bg-[#40ac40]/10 border border-[#40ac40]/30',
  archived: 'text-gray-300 bg-gray-500/10 border border-gray-400/30',
};

export const meetingStatusColors: Record<MeetingStatus, string> = {
  scheduled: 'text-[#3ba3ea] bg-[#3ba3ea]/10 border-[#3ba3ea]/30',
  live: 'text-[#ea3b3b] bg-[#ea3b3b]/10 border-[#ea3b3b]/30 animate-pulse',
  processing: 'text-[#e8ea3b] bg-[#e8ea3b]/10 border-[#e8ea3b]/30',
  ready: 'text-[#40ac40] bg-[#40ac40]/10 border-[#40ac40]/30',
  shared: 'text-[#3ba3ea] bg-[#3ba3ea]/10 border-[#3ba3ea]/30',
  archived: 'text-gray-300 bg-gray-500/10 border-gray-400/30',
};

export const appointmentStatusColors: Record<string, string> = {
  confirmed: 'bg-[#40ac40]/20 text-[#40ac40] border border-[#40ac40]/30',
  pending: 'bg-[#3ba3ea]/20 text-[#3ba3ea] border border-[#3ba3ea]/30',
  cancelled: 'bg-[#ea3b3b]/20 text-[#ea3b3b] border border-[#ea3b3b]/30',
};

export const adminFileStatusColors: Record<string, string> = {
  Ready: 'text-[#40ac40] bg-[#40ac40]/10 border border-[#40ac40]/30',
  Signed: 'text-[#3ba3ea] bg-[#3ba3ea]/10 border border-[#3ba3ea]/30',
  Approved: 'text-[#40ac40] bg-[#40ac40]/10 border border-[#40ac40]/30',
  'In Review': 'text-[#e8ea3b] bg-[#e8ea3b]/10 border border-[#e8ea3b]/30',
};
