import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Home } from './pages/Home';
import { AlbumEditor } from './pages/AlbumEditor';
import { AlbumView } from './pages/AlbumView';
import { SharedAlbumView } from './pages/SharedAlbumView';
import { Catalog } from './pages/Catalog';
import { Events } from './pages/Events';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { EventEditor } from './pages/EventEditor';
import { EventView } from './pages/EventView';
import { SharedEventView } from './pages/SharedEventView';
import { HeritageMap } from './pages/HeritageMap';
import { MediaLibrary } from './pages/MediaLibrary';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Album Editor - Full screen, no sidebar */}
          <Route
            path="/album/:id/edit"
            element={
              <ProtectedRoute>
                <AlbumEditor />
              </ProtectedRoute>
            }
          />

          {/* Album Viewer - Full screen flip-book */}
          <Route
            path="/album/:id"
            element={
              <ProtectedRoute>
                <AlbumView />
              </ProtectedRoute>
            }
          />

          {/* Shared Album View - Public */}
          <Route path="/shared/:token" element={<SharedAlbumView />} />
          <Route path="/share/:token" element={<SharedEventView />} />

          {/* Dedicated Event Reading View - No Layout, open in new tab */}
          <Route
            path="/event/:id/view"
            element={
              <ProtectedRoute>
                <EventView />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/library" element={<Catalog />} />
                    <Route path="/media" element={<MediaLibrary />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/map" element={<HeritageMap />} />
                    <Route path="/event/new" element={<EventEditor />} />
                    <Route path="/event/:id/edit" element={<EventEditor />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App
