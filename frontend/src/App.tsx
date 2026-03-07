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
    const { hash } = location;

    // If there's no hash, just scroll to the top on route change
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    const targetId = hash.slice(1);
    if (!targetId) return;

    const scrollToHash = () => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Try immediately in case the element is already rendered
    scrollToHash();
    // And schedule once after paint to catch elements that mount slightly later
    const timeoutId = window.setTimeout(scrollToHash, 0);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-black text-white">
      {!isPlatformRoute && <Navbar scrolled={scrolled} />}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
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
