/*
  # Import Notion CRM Contacts

  1. New Records
    - Import 27+ contacts from Notion CRM database
    - Include company names, first names, categories, emails, phones, locations
    - Add services requested for each client
    
  2. Data
    - AABlendz - Alben - Personal Care - Calgary
    - Arjit Real Estate - Arjit - Real Estate - Calgary
    - Artlanta - Lawal - Art - Miami
    - Billions Club - Elio - Web3 - Tulum
    - Can Stays Rental Alliance - Catherine - Hospitality - Orlando
    - ColombiaXclusive - Roy - Travel Agency - Medellin
    - FBA Specialists - Andrew - E-Commerce - California
    - Gusto Law - Gus - Law - Calgary
    - Host Launch - Braydon - Real Estate - Vancouver
    - Incorporate Living - David - Real Estate - Calgary
    - Infinite Passive Assets - Steve - Investing - Ohio
    - International Gold Express LLC - Luke - E-Commerce - 5444 GRAYS
    - Kauil Tulum - Shanali - Real Estate - Tulum
    - Light Speed Marketing - Tony - Real Estate - Tulum/Playa Del Carmen
    - Linkbase Technologies Inc - Shiven - Hospitality - Kelowna
    - Nomadics - Braden - Real Estate - Calgary
    - Novix Markets - Jalel - Finance - Dubai
    - Oleg Brigvadze - Oleg - Investing - Calgary
    - Premium FX Academy - David - Forex - Medellin

  3. Notes
    - All contacts set to 'active' status
    - Services requested mapped from Notion tags
    - Created with current timestamp
*/

-- Insert AABlendz
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('AABlendz', 'AABlendz', 'Alben', 'alben@aablendz.com', 'Personal Care', 'Calgary', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Arjit Real Estate
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Arjit Real Estate', 'Arjit Real Estate', 'Arjit', 'arjit@arjitrealestate.com', 'Real Estate', 'Calgary', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Artlanta
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Artlanta', 'Artlanta', 'Lawal', 'lawal@artlanta.com', 'Art', 'Miami', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Billions Club
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Billions Club', 'Billions Club', 'Elio', 'elio@billionsclub.com', 'Web3', 'Tulum', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Can Stays Rental Alliance
INSERT INTO clients (name, company, first_name, email, phone, category, location, status, created_at, updated_at)
VALUES ('Can Stays Rental Alliance', 'Can Stays Rental Alliance', 'Catherine', 'catherine@losttogethetrays.com', '(813) 363-3408', 'Hospitality', 'Orlando', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert ColombiaXclusive
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('ColombiaXclusive', 'ColombiaXclusive', 'Roy', 'roy@colombiaxclusive.com', 'Travel Agency', 'Medellin', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert FBA Specialists
INSERT INTO clients (name, company, first_name, email, phone, category, location, services_requested, status, created_at, updated_at)
VALUES ('FBA Specialists', 'FBA Specialists', 'Andrew', 'FBAleadsusa@gmail.com', '+1 (949) 646-3442', 'E-Commerce', 'California', ARRAY['WordPress Website'], 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Gusto Law
INSERT INTO clients (name, company, first_name, email, phone, category, location, services_requested, status, created_at, updated_at)
VALUES ('Gusto Law', 'Gusto Law', 'Gus', 'guslu@gustolaw.ca', '+1 (403) 604-1977', 'Law', 'Calgary', ARRAY['WordPress Website'], 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Host Launch
INSERT INTO clients (name, company, first_name, email, category, location, services_requested, status, created_at, updated_at)
VALUES ('Host Launch', 'Host Launch', 'Braydon', 'hello@hostlaunch.co', 'Real Estate', 'Vancouver', ARRAY['SEO', 'Brand Identity', 'WordPress Website', 'Video Editing'], 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Incorporate Living
INSERT INTO clients (name, company, first_name, email, category, location, services_requested, status, created_at, updated_at)
VALUES ('Incorporate Living', 'Incorporate Living', 'David', 'dclarke@incorporateliving.com', 'Real Estate', 'Calgary', ARRAY['WordPress Website', 'Graphic Design', 'Landing Page', 'SEO'], 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Infinite Passive Assets
INSERT INTO clients (name, company, first_name, email, phone, category, location, status, created_at, updated_at)
VALUES ('Infinite Passive Assets', 'Infinite Passive Assets', 'Steve', 'steve@infinitepassiveassets.com', '+1 (317) 446-6026', 'Investing', 'Ohio', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert International Gold Express LLC
INSERT INTO clients (name, company, first_name, email, phone, category, location, status, created_at, updated_at)
VALUES ('International Gold Express LLC', 'International Gold Express LLC', 'Luke', 'lukealexanderberry@gmail.com', '3104139059', 'E-Commerce', '5444 GRAYS', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Kauil Tulum
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Kauil Tulum', 'Kauil Tulum', 'Shanali', 'shanali@kauiltulum.com', 'Real Estate', 'Tulum', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Light Speed Marketing
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Light Speed Marketing', 'Light Speed Marketing', 'Tony', 'tony@lightspeedmarketing.com', 'Real Estate', 'Playa Del Carmen', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Linkbase Technologies Inc
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Linkbase Technologies Inc', 'Linkbase Technologies Inc', 'Shiven', 'shiven@linkbasetech.com', 'Hospitality', 'Kelowna', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Nomadics
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Nomadics', 'Nomadics', 'Braden', 'braden@nomadics.com', 'Real Estate', 'Calgary', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Novix Markets
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Novix Markets', 'Novix Markets', 'Jalel', 'jalel@novixmarkets.com', 'Finance', 'Dubai', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Oleg Brigvadze
INSERT INTO clients (name, company, first_name, email, category, location, status, created_at, updated_at)
VALUES ('Oleg Brigvadze', 'Oleg Brigvadze', 'Oleg', 'oleg@obinvesting.com', 'Investing', 'Calgary', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Premium FX Academy
INSERT INTO clients (name, company, first_name, email, phone, category, location, status, created_at, updated_at)
VALUES ('Premium FX Academy', 'Premium FX Academy', 'David', 'Davidguerrerofx93@gmail.com', '+573502946706', 'Forex', 'Medellin', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;
