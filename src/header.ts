// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

import { Client, Account, Models } from "appwrite";
import { CONFIG } from "./config.ts";

console.info("Running Einkaufshelfer@" + CONFIG.VERSION);

const pageHeader = document.querySelector<HTMLElement>(
  "header#pageHeader.standardheader",
);
const pageHeaderLoginButton = pageHeader
  ? pageHeader.querySelector<HTMLButtonElement>("button#headerLogin")
  : null;
const pageHeaderLogoffButton = pageHeader
  ? pageHeader.querySelector<HTMLButtonElement>("button#headerLogoff")
  : null;
const pageHeaderUserInfo = pageHeader
  ? pageHeader.querySelector<HTMLAnchorElement>("a#headerUserInfo")
  : null;

const homeLink = pageHeader
  ? pageHeader.querySelector<HTMLAnchorElement>("a#homeLink")
  : null;

const headerIsDamaged =
  !pageHeader ||
  !pageHeaderLoginButton ||
  !pageHeaderLogoffButton ||
  !pageHeaderUserInfo ||
  !homeLink;

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

const userLoggedIn = async (user: Models.User<Models.Preferences>) => {
  pageHeaderLogoffButton.disabled = false;
  pageHeaderUserInfo.innerText = user.email;
  if (homeLink) {
    homeLink.href = "/uebersicht.html";
  }
  const session = await accountAPI.getSession("current");
  if (
    session.provider === "oidc" &&
    session?.providerAccessTokenExpiry &&
    new Date(session.providerAccessTokenExpiry).getTime() <
      Date.now() + 1000 * 60 * 30
  ) {
    accountAPI.updateSession("current");
  }
};

const userNotLoggedIn = async (_: any) => {
  pageHeaderLoginButton.disabled = false;
};

accountAPI.get().then(userLoggedIn, userNotLoggedIn);
