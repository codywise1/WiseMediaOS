-- Seed Global Clauses (G01-G15)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('G01', 'global', 'scope_deliverables', 'Scope Control', 'Services are limited to those explicitly stated in this agreement. No implied deliverables exist. Any work outside the defined scope requires a separate Change Request.', 1, true),
('G02', 'global', 'scope_deliverables', 'Deliverables and Acceptance', 'Deliverables are deemed accepted upon: (a) written approval, (b) use in production, or (c) five (5) business days without written rejection.', 2, true),
('G03', 'global', 'timeline', 'Timeline and Dependencies', 'All timelines are estimates contingent on Client responsiveness, approvals, and asset delivery. Delays caused by Client extend timelines without penalty to Service Provider.', 3, true),
('G04', 'global', 'pricing_payment', 'Pricing and Payment Enforcement', 'All fees are as stated in the Proposal. Prices are exclusive of applicable taxes. Late payments may result in service suspension, late fees, or withholding of deliverables.', 4, true),
('G05', 'global', 'change_requests', 'Change Request Process', 'Any request altering scope, deliverables, or timelines constitutes a Change Request requiring written approval and may result in revised pricing and timelines.', 5, true),
('G06', 'global', 'scope_deliverables', 'Client Responsibilities', 'Client agrees to provide accurate information, assets, and timely responses. Client secures necessary licenses, permissions, and content rights. Failure may impact delivery without liability to Service Provider.', 6, true),
('G07', 'global', 'ip_ownership', 'IP and Ownership Transfer', 'Upon full payment, Client is granted rights to final deliverables only. Service Provider retains ownership of frameworks, templates, systems, and proprietary processes.', 7, true),
('G08', 'global', 'revisions', 'Revisions and Overages', 'Revision limits are defined per service. Additional revisions beyond included scope are billable at standard rates.', 8, true),
('G09', 'global', 'legal_acceptance', 'No Guarantees', 'Service Provider does not guarantee performance outcomes including revenue, rankings, traffic, conversions, or business success. Service Provider is not responsible for third-party platform failures.', 9, true),
('G10', 'global', 'legal_acceptance', 'Confidentiality', 'Both parties agree to maintain confidentiality of non-public business information disclosed during the engagement.', 10, true),
('G11', 'global', 'legal_acceptance', 'Termination and Non-Refund', 'Client may terminate with written notice. Fees paid are non-refundable. Outstanding balances remain due. Service Provider may terminate for non-payment or breach.', 11, true),
('G12', 'global', 'legal_acceptance', 'Limitation of Liability', 'Service Provider''s total liability shall not exceed total fees paid. Service Provider shall not be liable for indirect, incidental, or consequential damages.', 12, true),
('G13', 'global', 'legal_acceptance', 'Governing Law', 'This agreement is governed by the laws of the Province of Alberta, Canada, without regard to conflict of law principles.', 13, true),
('G14', 'global', 'legal_acceptance', 'Entire Agreement', 'This SOW, together with the Proposal, constitutes the entire agreement and supersedes all prior communications.', 14, true),
('G15', 'global', 'legal_acceptance', 'Acceptance and E-Signature', 'Acceptance of the Proposal constitutes acceptance of this SOW in full. Electronic signatures are binding.', 15, true)
on conflict (code) do nothing;

-- Website Development Clauses (W01-W09)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('W01', 'website', 'scope_deliverables', 'Pages and Sections', 'Website includes the number of pages and sections as specified in the Proposal. Additional pages require separate pricing.', 101, true),
('W02', 'website', 'scope_deliverables', 'Responsive Design', 'Website will be responsive across desktop, tablet, and mobile devices using modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions).', 102, true),
('W03', 'website', 'scope_deliverables', 'CMS Setup', 'Content Management System (CMS) will be configured to allow Client editing of specified content areas. Training documentation provided.', 103, true),
('W04', 'website', 'scope_deliverables', 'Integrations', 'Included integrations: contact forms, email service, and analytics tracking. Additional integrations require separate scoping.', 104, true),
('W05', 'website', 'scope_deliverables', 'Browser Testing', 'Testing conducted on modern browsers. Legacy browser support (IE11, older versions) not included unless specified.', 105, true),
('W06', 'website', 'timeline', 'Launch and Support', 'Launch includes DNS configuration assistance and go-live support. Post-launch support window: 7 days for critical bugs only.', 106, true),
('W07', 'website', 'scope_deliverables', 'Content Responsibility', 'Client provides all copy, images, and media assets by agreed deadline. Delays in asset delivery extend project timeline.', 107, true),
('W08', 'website', 'pricing_payment', 'Hosting and Domain', 'Hosting and domain registration are Client costs unless explicitly included in Proposal. Service Provider can recommend providers.', 108, true),
('W09', 'website', 'revisions', 'Revision Policy', 'Includes two (2) rounds of revisions during design phase and one (1) round during build phase. Additional revisions billed separately.', 109, true)
on conflict (code) do nothing;

-- Landing Page Clauses (L01-L06)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('L01', 'landing_page', 'scope_deliverables', 'Single Page Definition', 'Landing page is a single-page layout with defined sections as specified in Proposal. Multi-page builds require separate pricing.', 201, true),
('L02', 'landing_page', 'scope_deliverables', 'Conversion Goal', 'Page optimized for one primary conversion goal and call-to-action (CTA). Multiple conversion paths require additional scoping.', 202, true),
('L03', 'landing_page', 'scope_deliverables', 'Form Integration', 'Includes integration of one lead capture form with email notification or CRM connection as specified.', 203, true),
('L04', 'landing_page', 'revisions', 'Revision Limits', 'Includes one (1) round of layout revisions. Copy edits limited to minor adjustments. Major rewrites billed separately.', 204, true),
('L05', 'landing_page', 'scope_deliverables', 'Analytics Setup', 'Analytics tracking pixel placement included if tracking code provided by Client.', 205, true),
('L06', 'landing_page', 'timeline', 'Delivery Timeline', 'Timeline assumes all assets (copy, images, branding) provided by Client within 3 business days of project start.', 206, true)
on conflict (code) do nothing;

-- Web App Clauses (A01-A08)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('A01', 'web_app', 'scope_deliverables', 'MVP Scope Boundary', 'Development limited to Minimum Viable Product (MVP) features as defined in Proposal. Feature list constitutes the scope boundary.', 301, true),
('A02', 'web_app', 'scope_deliverables', 'Roles and Permissions', 'User roles and permission levels as specified in Proposal. Additional roles or complex permission logic requires separate scoping.', 302, true),
('A03', 'web_app', 'scope_deliverables', 'Environments', 'Includes staging and production environments. Development environment access provided during build phase.', 303, true),
('A04', 'web_app', 'timeline', 'QA and Bug Fix Window', 'Quality assurance testing and bug fixes included for 14 days post-delivery for issues within original scope only.', 304, true),
('A05', 'web_app', 'legal_acceptance', 'Third-Party Dependencies', 'App may rely on third-party APIs and services. Service Provider not responsible for third-party rate limits, changes, or outages.', 305, true),
('A06', 'web_app', 'legal_acceptance', 'Security and Compliance', 'Standard security practices implemented. Compliance certifications (HIPAA, SOC2, etc.) not included unless explicitly stated.', 306, true),
('A07', 'web_app', 'scope_deliverables', 'Handoff and Ownership', 'Upon completion, Client receives access credentials, deployment documentation, and repository access if included in Proposal.', 307, true),
('A08', 'web_app', 'change_requests', 'Feature Changes Post-MVP', 'New features or changes after MVP scope lock require formal Change Request with separate timeline and pricing.', 308, true)
on conflict (code) do nothing;

-- Brand Identity Clauses (B01-B07)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('B01', 'brand_identity', 'scope_deliverables', 'Concept Count', 'Includes number of initial logo concepts as specified in Proposal. Client selects one concept for refinement.', 401, true),
('B02', 'brand_identity', 'scope_deliverables', 'Deliverables Included', 'Includes: primary logo, logo variations (horizontal, stacked, icon), color palette, typography system, and brand guidelines document.', 402, true),
('B03', 'brand_identity', 'scope_deliverables', 'File Formats', 'Final files delivered in: AI, EPS, SVG, PNG (transparent), and JPG formats. Additional formats available upon request.', 403, true),
('B04', 'brand_identity', 'revisions', 'Revision Rounds', 'Includes two (2) rounds of revisions on selected concept. A revision is defined as adjustments to existing design, not new concepts.', 404, true),
('B05', 'brand_identity', 'ip_ownership', 'Usage Rights', 'Full usage rights and ownership transfer to Client upon final payment. Client may use brand identity for all business purposes.', 405, true),
('B06', 'brand_identity', 'legal_acceptance', 'Trademark Search', 'Trademark search and registration not included unless explicitly added to Proposal. Client responsible for trademark clearance.', 406, true),
('B07', 'brand_identity', 'scope_deliverables', 'Final Approval', 'Brand identity deemed final upon Client approval or 7 days after delivery without feedback. Changes after approval billed separately.', 407, true)
on conflict (code) do nothing;

-- SEO Clauses (S01-S07)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('S01', 'seo', 'scope_deliverables', 'Page Unit Definition', 'SEO service priced per page or post. One unit equals one optimized page with content, metadata, and on-page optimization.', 501, true),
('S02', 'seo', 'scope_deliverables', 'Keyword Targeting', 'Keyword research and targeting based on search intent and competition analysis. Final keyword selection requires Client approval.', 502, true),
('S03', 'seo', 'scope_deliverables', 'Content Approval', 'Client approves topics and outlines before content creation. Content written to SEO best practices and brand voice guidelines.', 503, true),
('S04', 'seo', 'legal_acceptance', 'No Ranking Guarantees', 'SEO is a long-term strategy. Service Provider does not guarantee specific rankings, traffic numbers, or timeline to results.', 504, true),
('S05', 'seo', 'scope_deliverables', 'Publishing Requirements', 'Client provides CMS access for content publishing. Service Provider publishes content or provides ready-to-publish files.', 505, true),
('S06', 'seo', 'scope_deliverables', 'Metadata and Linking', 'Includes: title tags, meta descriptions, header optimization, internal linking strategy, and image alt text.', 506, true),
('S07', 'seo', 'revisions', 'Content Revisions', 'One (1) round of revisions included for factual accuracy and tone adjustments. Full content rewrites billed separately.', 507, true)
on conflict (code) do nothing;

-- Graphic Design Clauses (GFX01-GFX05)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('GFX01', 'graphic_design', 'scope_deliverables', 'Asset Count and Formats', 'Number of design assets as specified in Proposal. Each asset delivered in web-optimized formats (PNG, JPG).', 601, true),
('GFX02', 'graphic_design', 'scope_deliverables', 'Platform Specifications', 'Assets sized for specified platforms (social media, web, print). Custom sizing for additional platforms billed separately.', 602, true),
('GFX03', 'graphic_design', 'revisions', 'Revision Policy', 'Includes one (1) round of revisions per asset. Turnaround time: 2-3 business days per revision round.', 603, true),
('GFX04', 'graphic_design', 'scope_deliverables', 'Source Files', 'Source files (AI, PSD) not included unless explicitly stated in Proposal. Available as add-on.', 604, true),
('GFX05', 'graphic_design', 'ip_ownership', 'Usage Rights', 'Client receives full usage rights to final assets upon payment. Service Provider retains portfolio rights.', 605, true)
on conflict (code) do nothing;

-- Video Editing Clauses (V01-V05)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('V01', 'video_editing', 'scope_deliverables', 'Video Length and Formats', 'Video length as specified in Proposal. Delivered in MP4 format optimized for specified platforms (YouTube, Instagram, etc.).', 701, true),
('V02', 'video_editing', 'scope_deliverables', 'Footage Requirements', 'Client provides raw footage. Service Provider not responsible for footage quality issues. Minimum resolution: 1080p recommended.', 702, true),
('V03', 'video_editing', 'revisions', 'Revision Rounds', 'Includes two (2) rounds of revisions. A revision is defined as timing, transition, or effect adjustments, not complete re-edits.', 703, true),
('V04', 'video_editing', 'timeline', 'Turnaround Time', 'Standard turnaround: 5-7 business days after footage receipt. Rush delivery available for additional fee.', 704, true),
('V05', 'video_editing', 'legal_acceptance', 'Music Licensing', 'Licensed music not included unless specified. Client responsible for music rights. Royalty-free music recommendations available.', 705, true)
on conflict (code) do nothing;

-- Retainer Clauses (R01-R05)
insert into clauses (code, scope, section, title, body, sort_order, is_active) values
('R01', 'retainer', 'scope_deliverables', 'Monthly Scope Definition', 'Retainer includes defined scope bucket of services per month as specified in Proposal. Scope reviewed monthly.', 801, true),
('R02', 'retainer', 'pricing_payment', 'Hours and Overage', 'Includes specified hours or deliverables per month. Overage work billed at standard hourly rate with advance approval.', 802, true),
('R03', 'retainer', 'pricing_payment', 'Billing and Cancellation', 'Billed monthly in advance. Requires 14-day written notice for cancellation. No refunds for partial months.', 803, true),
('R04', 'retainer', 'scope_deliverables', 'Unused Work Policy', 'Unused hours or deliverables do not roll over to next month unless explicitly stated in Proposal.', 804, true),
('R05', 'retainer', 'timeline', 'Priority and Response Time', 'Retainer clients receive priority queue placement. Response time: 1-2 business days for requests.', 805, true)
on conflict (code) do nothing;
