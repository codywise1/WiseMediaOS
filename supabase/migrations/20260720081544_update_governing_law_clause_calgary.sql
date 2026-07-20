-- Update G13 Governing Law clause to specify Calgary, Alberta courts
UPDATE clauses
SET body = 'This Agreement is governed by the laws of the Province of Alberta and the federal laws of Canada applicable therein, without regard to conflict of law principles. The parties irrevocably attorn to the exclusive jurisdiction of the courts of the Province of Alberta, sitting in the City of Calgary, Alberta, Canada.',
    title = 'Governing Law and Jurisdiction'
WHERE code = 'G13';
