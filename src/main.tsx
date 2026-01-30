import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { CustomToaster } from "./components/custom-toaster";
import { initSettings } from "./store";

async function bootstrap() {
  await initSettings();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
      <CustomToaster />
    </React.StrictMode>,
  );
}

bootstrap();
