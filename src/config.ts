// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

"use strict";

export declare const EINKAUFSLISTE_VERSION: string;

export const CONFIG = Object.freeze({
  PROJECT_ID: "6772879d002b324f99dc",
  BACKEND_ENDPOINT: "https://cloud.appwrite.io/v1",
  DATABASE_ID: "67a9d7d3000cb5fd1956",
  DB_COLLECTION_SHOPPINGLISTS: "67a9d7f100202ba81c01",
  DB_COLLECTION_SHOPLISTENTRY: "67a9d8c50002a811f75e",
  MAX_CONCURRENT_HOUSEHOLDS: 10,
  FUNCTION_INVITE_TO_TEAM: "67b352430011122f36ac",
  VERSION: EINKAUFSLISTE_VERSION ?? "unknown-version",
  CONTACT_EMAIL: "einkaufshelfer@jotoho.de",
});
