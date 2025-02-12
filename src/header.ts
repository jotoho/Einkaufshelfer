// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

import { Client, Account, Models } from "appwrite";
import { CONFIG } from "./config.ts";

const pageHeader: HTMLElement | null = document.querySelector(
  "header#pageHeader.standardheader",
);
const pageHeaderLoginButton: HTMLButtonElement | null = pageHeader
  ? pageHeader.querySelector("button#headerLogin")
  : null;
const pageHeaderLogoffButton: HTMLButtonElement | null = pageHeader
  ? pageHeader.querySelector("button#headerLogoff")
  : null;
const pageHeaderSettingsButton: HTMLButtonElement | null = pageHeader
  ? pageHeader.querySelector("button#headerSettings")
  : null;

const pageHeaderUserInfo: HTMLDivElement | null = pageHeader
  ? pageHeader.querySelector("div#headerUserInfo")
  : null;

const headerIsDamaged =
  !pageHeader ||
  !pageHeaderLoginButton ||
  !pageHeaderLogoffButton ||
  !pageHeaderSettingsButton ||
  !pageHeaderUserInfo;

if (headerIsDamaged) {
  throw "Header is damaged. Cannot safely run header scripts.";
}

const client = new Client()
  .setEndpoint(CONFIG.BACKEND_ENDPOINT)
  .setProject(CONFIG.PROJECT_ID);

const accountAPI = new Account(client);

pageHeaderLoginButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    window.location.pathname = "/login.html";
  },
  { once: true },
);

pageHeaderLogoffButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    accountAPI
      .deleteSession("current")
      .then(() => (window.location.pathname = "/"));
  },
  { once: true },
);

pageHeaderSettingsButton.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    window.alert("This button doesn't do anything yet, sorry.");
  },
  { once: true },
);

const userLoggedIn = async (user: Models.User<Models.Preferences>) => {
  pageHeaderLogoffButton.disabled = false;
  pageHeaderSettingsButton.disabled = false;
  pageHeaderUserInfo.innerText =
    "Logged in as: " + user.name + " (" + user.email + ")";
};

const userNotLoggedIn = async (_: any) => {
  pageHeaderLoginButton.disabled = false;
};

accountAPI.get().then(userLoggedIn, userNotLoggedIn);
