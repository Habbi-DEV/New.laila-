import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../customer/Spinner';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-softgray flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
