import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./application/store/store.ts";
import { C7OneProvider, I18nProvider } from "@levkobe/c7one";
import { parchmentTheme, lightStateTokens } from "./themes.ts";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider defaultLocale="en" storageKey="diagravinci-locale">
        <C7OneProvider
          defaultMode="classic"
          config={{
            colors: parchmentTheme,
            tokens: lightStateTokens,
          }}
          storageKey="diagravinci-settings"
        >
          <App />
        </C7OneProvider>
      </I18nProvider>
    </Provider>
  </StrictMode>,
);
