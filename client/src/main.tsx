/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: React DOM entry point for Mark's Hobby Farm SPA. Mounts the App component
 *          and wraps it with TanStack QueryClientProvider for server-state management.
 *          Imports global Tailwind CSS styles from index.css.
 *          Depends on react-dom, @tanstack/react-query, App component.
 * SRP/DRY check: Pass - single entry point, no duplication
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

// React Query client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
