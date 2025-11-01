// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

"use strict";

export declare const EINKAUFSLISTE_VERSION: string;

export const CONFIG = Object.freeze({
  PROJECT_ID: "6905e60b0026b9455306",
  BACKEND_ENDPOINT: "https://appwrite.saas.jotoho.de/v1",
  DATABASE_ID: "6906122f00178d319d15",
  DB_COLLECTION_SHOPPINGLISTS: "shoppinglists",
  DB_COLLECTION_SHOPLISTENTRY: "shoplistentry",
  MAX_CONCURRENT_HOUSEHOLDS: 10,
  FUNCTION_INVITE_TO_TEAM: "69062247001e5611e12e",
  VERSION: EINKAUFSLISTE_VERSION ?? "unknown-version",
  CONTACT_EMAIL: "einkaufshelfer@jotoho.de",
});
