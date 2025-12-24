-- Map service types to their specific clauses
-- Website Development
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'website', id, true, true from clauses where code in ('W01','W02','W03','W04','W05','W06','W07','W08','W09')
on conflict (service_type, clause_id) do nothing;

-- Landing Page
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'landing_page', id, true, true from clauses where code in ('L01','L02','L03','L04','L05','L06')
on conflict (service_type, clause_id) do nothing;

-- Web App
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'web_app', id, true, true from clauses where code in ('A01','A02','A03','A04','A05','A06','A07','A08')
on conflict (service_type, clause_id) do nothing;

-- Brand Identity
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'brand_identity', id, true, true from clauses where code in ('B01','B02','B03','B04','B05','B06','B07')
on conflict (service_type, clause_id) do nothing;

-- SEO
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'seo', id, true, true from clauses where code in ('S01','S02','S03','S04','S05','S06','S07')
on conflict (service_type, clause_id) do nothing;

-- Graphic Design
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'graphic_design', id, true, true from clauses where code in ('GFX01','GFX02','GFX03','GFX04','GFX05')
on conflict (service_type, clause_id) do nothing;

-- Video Editing
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'video_editing', id, true, true from clauses where code in ('V01','V02','V03','V04','V05')
on conflict (service_type, clause_id) do nothing;

-- Retainer
insert into service_clause_map (service_type, clause_id, required, is_active)
select 'retainer', id, true, true from clauses where code in ('R01','R02','R03','R04','R05')
on conflict (service_type, clause_id) do nothing;
