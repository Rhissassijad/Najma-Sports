"use client";

import { useAuthGuard } from "@/lib/withAuth";
import { logout } from "@/lib/auth";

export default function Dashboard() {
  const { isAuthenticated, isCheckingAuth } = useAuthGuard("/");

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <div className="p-10">
      <h1 className="text-2xl mb-6">Dashboard</h1>

      <button
        onClick={logout}
        className="bg-red-500 px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}
