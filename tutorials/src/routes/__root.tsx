import { createRootRoute, Outlet } from '@tanstack/react-router';

// The shell shared by every page. Outlet is where the matched route renders.
export const Route = createRootRoute({
  component: () => <Outlet />,
});
