'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
}

export function ProtectedRoute({ children, requireOwner = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isOwner, loading } = useSession();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requireOwner && !isOwner) {
        router.push('/kasir');
      }
    }
  }, [isAuthenticated, isOwner, loading, router, requireOwner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || (requireOwner && !isOwner)) {
    return null;
  }

  return <>{children}</>;
}