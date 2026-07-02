import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme before first paint to avoid a light-mode flash.
const savedTheme = localStorage.getItem("himewo-theme");
if (
  savedTheme === "dark" ||
  (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
