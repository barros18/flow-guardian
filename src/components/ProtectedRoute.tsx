import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="animate-spin h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has no organization and is not already on onboarding, redirect there
  // This is a safety measure for manual registrations or migration edge cases
  const { profile } = useAuth();
  const isExcludedPath = window.location.pathname === "/onboarding";

  if (profile && !profile.organization_id && !isExcludedPath) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
