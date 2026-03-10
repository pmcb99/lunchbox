import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { DocsPage } from './pages/DocsPage';
import { PlatformLoginPage } from './pages/PlatformLoginPage';
import { PlatformPage } from './pages/PlatformPage';
import { PlatformDatabasesPage } from './pages/PlatformDatabasesPage';
import { DbViewerPage } from './pages/DbViewerPage';
import { PlatformRevisionsPage } from './pages/PlatformRevisionsPage';
import { PlatformSchedulesPage } from './pages/PlatformSchedulesPage';
import { PlatformKeysPage } from './pages/PlatformKeysPage';
import { Footer } from './components/Footer';
import { isAuthenticated } from './lib/auth';

function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!isAuthenticated()) {
    return <Navigate to="/platform/login" replace />;
  }

  return children;
}

function App() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isPlatformRoute = location.pathname.startsWith('/platform');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const { pathname } = location;

    const scrollToId = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Map pretty paths to landing page sections
    if (pathname === '/') {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    if (pathname === '/features') {
      scrollToId('features');
      return;
    }

    if (pathname === '/how-it-works') {
      scrollToId('how-it-works');
      return;
    }

    if (pathname === '/pricing') {
      scrollToId('pricing');
      return;
    }

    // Default: scroll to top on route change
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black text-white">
      {!isPlatformRoute && <Navbar scrolled={scrolled} />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<LandingPage />} />
          <Route path="/how-it-works" element={<LandingPage />} />
          <Route path="/pricing" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route
            path="/platform"
            element={
              <ProtectedRoute>
                <PlatformPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/databases"
            element={
              <ProtectedRoute>
                <PlatformDatabasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/db-viewer"
            element={
              <ProtectedRoute>
                <DbViewerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/revisions"
            element={
              <ProtectedRoute>
                <PlatformRevisionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/schedules"
            element={
              <ProtectedRoute>
                <PlatformSchedulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform/keys"
            element={
              <ProtectedRoute>
                <PlatformKeysPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isPlatformRoute && <Footer />}
    </div>
  );
}

export default App;
