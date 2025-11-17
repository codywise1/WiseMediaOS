import { useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import Auth from './components/Auth';
import Layout from './components/Layout';
import AdminDashboard from './components/dashboards/AdminDashboard';
import CreatorDashboard from './components/dashboards/CreatorDashboard';
import ProjectsPage from './pages/ProjectsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import InvoicesPage from './pages/InvoicesPage';
import ProposalsPage from './pages/ProposalsPage';
import ClientsPage from './pages/ClientsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotesModule from './components/notes/NotesModule';
import CoursesPage from './pages/CoursesPage';
import CourseSinglePage from './pages/CourseSinglePage';
import CommunityPage from './pages/CommunityPage';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceProductPage from './pages/MarketplaceProductPage';
import ToolsPage from './pages/ToolsPage';
import ProfilePage from './pages/ProfilePage';
import ReferralsPage from './pages/ReferralsPage';
import SettingsPage from './pages/SettingsPage';
import AdminBackendPage from './pages/AdminBackendPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { currentPage } = useNavigation();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return profile?.role === 'admin' ? <AdminDashboard /> : <CreatorDashboard />;
      case 'projects':
        return <ProjectsPage />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'proposals':
        return <ProposalsPage />;
      case 'clients':
        return <ClientsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'notes':
        return <NotesModule />;
      case 'courses':
        return <CoursesPage />;
      case 'course-single':
        return <CourseSinglePage />;
      case 'community':
        return <CommunityPage />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'marketplace-product':
        return <MarketplaceProductPage />;
      case 'tools':
        return <ToolsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'referrals':
        return <ReferralsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'admin-backend':
        return <AdminBackendPage />;
      default:
        return profile?.role === 'admin' ? <AdminDashboard /> : <CreatorDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md px-4">
          <div className="text-red-400 text-xl mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Profile Loading Error
          </div>
          <p className="text-gray-300 mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            We couldn't load your profile. This might be a temporary issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <NavigationProvider>
      <AppContent />
    </NavigationProvider>
  );
}

export default App;
