import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
} else if (import.meta.env.DEV && "serviceWorker" in navigator) {
  // A service worker from an earlier preview session can keep serving stale
  // assets and intercept Vite HMR requests. Development must stay network-first.
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {});
    if ("caches" in window) {
      caches.keys()
        .then(keys => Promise.all(keys.filter(key => key.startsWith("smartpanel-")).map(key => caches.delete(key))))
        .catch(() => {});
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
