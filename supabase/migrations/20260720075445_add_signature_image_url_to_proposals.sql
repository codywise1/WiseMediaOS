/*
# Add signature image URL to proposals

1. Modified Tables
- `proposals`
  - Add `signature_image_url` (text, nullable) — stores the URL of the digital signature image
    used when a client signs/approves a proposal. This allows the signature to be rendered
    on the proposal detail page and in generated PDFs.
2. Security
- No RLS policy changes. The column inherits the existing proposal RLS policies.
3. Notes
- The column is nullable so existing proposals are unaffected.
- The frontend will pass the signature image URL when approving a proposal.
*/

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS signature_image_url text;
