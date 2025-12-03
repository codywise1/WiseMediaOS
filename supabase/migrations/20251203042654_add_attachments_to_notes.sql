/*
  # Add Attachments Support to Notes

  1. Changes
    - Add `attachments` column to notes table as JSONB array
    - Each attachment will store: { name, url, type, size, uploaded_at }
  
  2. Purpose
    - Allow users to attach files (images, PDFs, documents) to notes
    - Store file metadata for proper display and management
*/

ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
