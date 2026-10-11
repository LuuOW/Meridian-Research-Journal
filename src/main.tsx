import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Catch any unhandled window errors gracefully
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.warn("[System] Intercepted runtime error:", event.message || event);
    if (typeof event.preventDefault === "function") event.preventDefault();
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.warn("[System] Intercepted unhandled promise rejection:", event.reason);
    if (typeof event.preventDefault === "function") event.preventDefault();
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
