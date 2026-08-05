import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  component: () => (
    <div className="container mx-auto px-6 py-24 min-h-screen">
      <Outlet />
    </div>
  ),
});
