'use client';

import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Logged in as {user?.email}</p>
      <button onClick={() => void logout()}>Log out</button>
    </div>
  );
}
