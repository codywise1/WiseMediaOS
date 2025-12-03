# Wise Media Client Portal

A modern, professional client portal built with React, TypeScript, and Supabase for managing client relationships, projects, invoices, appointments, and support tickets.

## 🚀 Features

### For Clients
- **Dashboard**: Overview of projects, invoices, and appointments
- **Projects**: View assigned projects with progress tracking
- **Invoices**: View and pay outstanding invoices with PayPal integration
- **Appointments**: View scheduled meetings and join video calls
- **Support**: Submit tickets and access knowledge base

### For Admins
- **Full Client Management**: Add, edit, and manage client information
- **Project Management**: Create and track projects with Kanban/Grid views
- **Invoice Management**: Generate, send, and track invoices
- **Appointment Booking**: Integrated Google Calendar booking system
- **Proposal Management**: Create and manage project proposals
- **Support System**: Handle client tickets and provide support

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Payments**: PayPal integration
- **Calendar**: Google Calendar integration
- **Deployment**: Bolt Hosting

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google Calendar API access (for appointment booking)
- PayPal Developer account (for payments)

## 🔧 Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd wise-media-portal
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Supabase Configuration (Required for production)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# PayPal Configuration (Optional)
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Google Calendar (Update in Appointments.tsx)
# Replace the calendar URL in appointmentTypes array
```

### 3. Supabase Setup

#### Database Schema
The application uses the following tables (automatically created via migrations):
- `clients` - Client information and contact details
- `projects` - Project management and tracking
- `invoices` - Invoice generation and payment tracking
- `proposals` - Project proposals and contracts
- `appointments` - Meeting and consultation scheduling
- `support_tickets` - Customer support and help desk

#### Authentication Setup
1. Go to Supabase Dashboard → Authentication → Settings
2. Configure email templates and settings
3. Set up Row Level Security (RLS) policies (included in migrations)

#### Run Migrations
The database schema is automatically set up through Supabase migrations located in `/supabase/migrations/`.

### 4. Google Calendar Integration
1. Update the `calendarUrl` in `src/components/Appointments.tsx`
2. Replace with your Google Calendar booking link
3. The system will auto-populate client information

### 5. Development
```bash
npm run dev
```

### 6. Production Build
```bash
npm run build
```

## 🔐 Authentication & User Management

### Demo Mode (No Supabase)
When Supabase is not configured, the app runs in demo mode with test credentials:
- **Admin**: username: `admin`, password: `admin`
- **Client**: username: `user`, password: `user`

### Production Mode (With Supabase)
- **Sign Up**: New users can create accounts
- **Email Authentication**: Secure email/password authentication
- **Role-Based Access**: Admin and client roles with different permissions
- **Session Management**: Persistent login sessions

## 👥 User Roles & Permissions

### Admin Users
- Full access to all features
- Client management (CRUD operations)
- Project creation and management
- Invoice generation and tracking
- Appointment booking and management
- Proposal creation and management
- Support ticket management

### Client Users
- View assigned projects (read-only)
- View and pay invoices
- View scheduled appointments
- Submit support tickets
- Limited dashboard view

## 🎨 Design & Branding

- **Brand Colors**: Custom blue (#3aa3eb) with status indicators
- **Glass Morphism**: Modern glass card design
- **Responsive**: Mobile-first responsive design
- **Professional**: Clean, corporate aesthetic
- **Accessibility**: High contrast and readable fonts

## 💳 Payment Integration

### PayPal Setup
1. Create PayPal Developer account
2. Get Client ID from PayPal Dashboard
3. Add to environment variables
4. Test with PayPal sandbox

### Payment Features
- **Invoice Payments**: Direct PayPal integration
- **Multiple Methods**: PayPal, Credit Card simulation, Bank Transfer
- **Payment Tracking**: Automatic status updates
- **PDF Generation**: Branded invoice PDFs

## 📅 Calendar Integration

### Google Calendar
- **Direct Booking**: Integrated booking system
- **Client Auto-fill**: Automatic client information population
- **Multiple Types**: Consultation, Review, and Discovery calls
- **Duration Options**: 30min, 45min, 60min appointments

## 🚀 Deployment

### Bolt Hosting (Recommended)
The app is configured for Bolt Hosting deployment:
```bash
# Automatic deployment through Bolt interface
```

### Manual Deployment
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## 🔧 Configuration

### Brand Customization
- Update logo URLs in components
- Modify brand colors in Tailwind config
- Customize email templates in Supabase

### Feature Toggles
- Enable/disable PayPal payments
- Configure appointment types
- Customize dashboard widgets

## 📊 Database Schema

### Key Tables
- **clients**: Client management and contact information
- **projects**: Project tracking with status and progress
- **invoices**: Invoice generation with payment status
- **proposals**: Project proposals and contracts
- **appointments**: Calendar and meeting management
- **support_tickets**: Help desk and support system

### Security
- Row Level Security (RLS) enabled on all tables
- User-based data isolation
- Secure authentication with Supabase Auth

## 🐛 Troubleshooting

### Common Issues
1. **Supabase Connection**: Check environment variables
2. **PayPal Integration**: Verify Client ID and sandbox settings
3. **Calendar Booking**: Update Google Calendar URL
4. **Database Errors**: Check RLS policies and permissions

### Support
- Check browser console for errors
- Verify environment configuration
- Test database connections
- Review Supabase logs

## 📝 License

This project is proprietary software for Wise Media.

## 🤝 Contributing

This is a private project. Contact the development team for contribution guidelines.

---

**Wise Media Client Portal** - Professional client management made simple.
