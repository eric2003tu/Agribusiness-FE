import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PageLoader } from "./components/page-loader";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: PageLoader,
    // Avoid a flash of the loader on fast transitions, but once it does show,
    // keep it up long enough not to flicker.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
  });

  return router;
};
