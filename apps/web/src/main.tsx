import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@cartography-lab/tokens";
import "@cartography-lab/ui/styles.css";
import "./styles/app.css";
import "./styles/theme-flow.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
