// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

import { CONFIG } from "../src/config.ts";
import { showToast } from "../src/notifications.ts";
import { Client, Account, Models } from "appwrite";

const requestClient = new Client()
  .setEndpoint(CONFIG.BACKEND_ENDPOINT)
  .setProject(CONFIG.PROJECT_ID);
const accountAPI = new Account(requestClient);

accountAPI.getSession("current").then(
  (session: Models.Session) => {
    if (session.provider === "oidc") {
      window.location.href = "/uebersicht.html";
    } else {
      showToast(
        `Unerwartete Sitzungsdaten.
        Sie wurden durch einen anderen Mechanismus angemeldet und werden bald weitergeleitet.`,
      );
      console.error("Unexpected session state", session);
      setTimeout(() => (window.location.href = "/uebersicht.html"), 5_000);
    }
  },
  (reason: any) => {
    showToast(
      "Login unerwartet fehlgeschlagen. Sie werden zur lokalen Anmeldung zurückgeschickt.",
    );
    console.error("Login was unsuccessful - no current session.", reason);
    setTimeout(() => (window.location.href = "/login.html"), 5_000);
  },
);
