import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './routes/Login';
import { ProfileSelect } from './routes/ProfileSelect';
import { ChapterUpload } from './routes/ChapterUpload';
import { ChapterViewer } from './routes/ChapterViewer';
import { useAuthStore } from './state/authStore';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/profiles"
        element={
          <RequireAuth>
            <ProfileSelect />
          </RequireAuth>
        }
      />
      <Route
        path="/upload"
        element={
          <RequireAuth>
            <ChapterUpload />
          </RequireAuth>
        }
      />
      <Route
        path="/chapter"
        element={
          <RequireAuth>
            <ChapterViewer />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
