import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { appRouter } from "@/app/router";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import "@/styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={appRouter} />
    </ErrorBoundary>
  </React.StrictMode>
);



