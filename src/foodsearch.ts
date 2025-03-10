// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

/// <reference types="vite/types/importMeta.d.ts" />

import { showToast } from "./notifications";
import { CONFIG } from "./config.ts";

const initialSearchTerm =
  new URLSearchParams(document.location.search).get("search") ?? "";

const initialSearchPage = Number.parseInt(
  new URLSearchParams(document.location.search).get("page") ?? "1",
  10,
);

const domFormFoodSearch = document.querySelector<HTMLFormElement>(
  "main form#foodSearch",
);
const domSearchResults = document.querySelector<HTMLOListElement>(
  "main ol#searchResults",
);
const domSearchField = domFormFoodSearch
  ? domFormFoodSearch.querySelector<HTMLInputElement>(
      "input[type=text][name=searchTerm]",
    )
  : domFormFoodSearch;

const domFormSubmit = domFormFoodSearch
  ? domFormFoodSearch.querySelector<HTMLInputElement>("input[type=submit]")
  : domFormFoodSearch;

const nextPageButton = document.querySelector<HTMLButtonElement>("main button#nextPage");

let documentCorrupt: boolean = false;
for (const domElement of [
  domFormFoodSearch,
  domSearchResults,
  domSearchField,
  domFormSubmit,
  nextPageButton,
]) {
  if (domElement === null) {
    documentCorrupt = true;
    throw "Expected DOM element is null! Aborting...";
  }
}

const API_USER_AGENT = `Einkaufshelfer/${CONFIG.VERSION} (${CONFIG.CONTACT_EMAIL}) - https://github.com/jotoho/Einkaufshelfer on origin ${document.location}`;

// Use staging or production backend?
const API_FOOD_SEARCH_BACKEND = import.meta.env.PROD
  ? "https://world.openfoodfacts.org/"
  : "https://world.openfoodfacts.net/";
console.info("Using openfoodfacts backend", API_FOOD_SEARCH_BACKEND);

const durationUnitResolution = Object.freeze({
  MILLISECOND: 1,
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
  WEEK: 604_800_000,
});

interface RatelimitInformation {
  readonly localStorageKey: string;
  readonly durationUnit: keyof typeof durationUnitResolution;
  readonly numDuration: number;
  readonly countAllowed: number;
}

interface RatelimitCollection {
  readonly [name: string]: RatelimitInformation;
}

const RATELIMIT_CAP: RatelimitCollection = {
  PRODUCT_QUERY: {
    localStorageKey: "RATE_LIMIT_PRODUCT",
    durationUnit: "MINUTE",
    numDuration: 1,
    countAllowed: 100,
  },
  SEARCH_QUERY: {
    localStorageKey: "RATE_LIMIT_SEARCH",
    durationUnit: "MINUTE",
    numDuration: 1,
    countAllowed: 10,
  },
  FACET_QUERY: {
    localStorageKey: "RATE_LIMIT_FACET",
    durationUnit: "MINUTE",
    numDuration: 1,
    countAllowed: 2,
  },
};

const getValidUsageTimes = (cap: RatelimitInformation) => {
  const usageTimesRaw = window.localStorage.getItem(cap.localStorageKey);
  const usageTimes: number[] =
    usageTimesRaw !== null ? JSON.parse(usageTimesRaw) : [];
  const now = Date.now();
  const validUsageTimes = usageTimes.filter(
    (ut) =>
      ut >= now - durationUnitResolution[cap.durationUnit] * cap.numDuration &&
      ut <= now,
  );
  return validUsageTimes;
};

/*
  First return value is how many operations may be performed now.
  Second return value is the timestamp when another operation will become available, or the recent past if all operation slots are available.
*/
const getAvailableCap = (
  cap: RatelimitInformation,
  purgeOld: boolean = false,
) => {
  const validUsageTimes = getValidUsageTimes(cap);
  if (purgeOld) {
    window.localStorage.setItem(
      cap.localStorageKey,
      JSON.stringify(validUsageTimes),
    );
  }
  return {
    operationsAvailable: cap.countAllowed - validUsageTimes.length,
    timestampNextAvailable:
      validUsageTimes.length >= cap.countAllowed
        ? validUsageTimes.reduce((agg, cur) => Math.min(agg, cur)) +
          durationUnitResolution[cap.durationUnit] * cap.numDuration
        : null,
  };
};

const updateSearchButtonStatus = () => {
  if (documentCorrupt) {
    return;
  }
  const limit = RATELIMIT_CAP["SEARCH_QUERY"];
  const limitState = limit ? getAvailableCap(limit) : null;
  const limitExhausted = limit ? limitState!.operationsAvailable === 0 : true;
  domFormSubmit!.disabled = limitExhausted;
  if (limitExhausted && limitState?.timestampNextAvailable) {
    setTimeout(
      updateSearchButtonStatus,
      limitState.timestampNextAvailable - Date.now(),
    );
  }
};

const recordUsage = (cap: RatelimitInformation, usages: number = 1): void => {
  if (!Number.isFinite(usages) || usages < 1 || !Number.isInteger(usages)) {
    throw "usages must be a positive finite non-zero integer";
  }
  const currentlyCountedUsageTimes = getValidUsageTimes(cap);
  for (
    let newUsagesRecorded = 0;
    newUsagesRecorded < usages;
    newUsagesRecorded++
  ) {
    currentlyCountedUsageTimes.push(Date.now());
  }
  console.debug(
    `Currently counting ${currentlyCountedUsageTimes.length} for limit`,
    cap,
  );
  window.localStorage.setItem(
    cap.localStorageKey,
    JSON.stringify(currentlyCountedUsageTimes),
  );
  updateSearchButtonStatus();
};

interface Product {
  brands_tags?: string[];
  nutriscore_grade?: string;
  product_name?: string;
  nutriments?: {
    energy?: number;
    "energy-kcal"?: number;
    [nutriment: string]: number | string | undefined;
  };
}

const escapeHtml = (unsafeStr: string): string => {
  return unsafeStr
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace('"', "&quot;")
    .replace("'", "&apos;");
};

const createSearchResultDOM = (result: Product): HTMLElement => {
  const resultDOM = document.createElement("li");
  const nutrimentKeys = Object.keys(result.nutriments ?? {});
  resultDOM.innerHTML = `
        <p>
            <span class="productname">
            "${escapeHtml(result.product_name || "Unbekanntes Produkt")}"
            </span>
            von
            <span class="brandnames">
            ${escapeHtml(result.brands_tags?.reduce?.((agg, cur) => (agg ? agg + ", " + cur : cur), "") || "unbekannt")}
            </span>
        </p>
        <p>
            Nutriscore-Note: ${escapeHtml(result.nutriscore_grade!.toUpperCase?.() ?? "unbekannt")}
        </p>
        <table class="nutriments">
            Nährstoffe:
            <thead><th>Nährstoff</th><th>Menge</th></thead>
            <tbody></tbody>
        </table>
    `;
  const nutrimentTable = resultDOM.querySelector<HTMLTableSectionElement>(
    "table.nutriments > tbody",
  );
  for (const nutriKey of nutrimentKeys.filter((k) => !k.includes("_"))) {
    const row = document.createElement("tr");
    const cellKey = document.createElement("td");
    const cellValue = document.createElement("td");
    cellKey.innerText = nutriKey + ": ";
    cellValue.innerText =
      String(result.nutriments?.[nutriKey] ?? "") +
      " " +
      String(result.nutriments?.[nutriKey + "_unit"] ?? "");
    row.appendChild(cellKey);
    row.appendChild(cellValue);
    nutrimentTable!.appendChild(row);
  }
  return resultDOM;
};

let latestSearchRequest: string | undefined = undefined;
let hasMorePages: boolean = false;

nextPageButton!.addEventListener("click", (event) => {
    event.preventDefault();
    if (hasMorePages && latestSearchRequest && latestSearchRequest.trim().length) {
        window.location.search = new URLSearchParams([
            ["search", latestSearchRequest],
            ["page", String(initialSearchPage + 1)],
        ]).toString();
    }
}, { once: true });

const updateNextPageButtonStatus = () => {
    if (nextPageButton) {
        nextPageButton.disabled = !hasMorePages;
    }
};

const performSearchFn = async (event?: HTMLElementEventMap["submit"]) => {
  if (event) {
    event.preventDefault();
  }
  if (documentCorrupt) {
    return;
  }
  const applicableLimit = RATELIMIT_CAP["SEARCH_QUERY"];
  if (applicableLimit && getAvailableCap(applicableLimit).operationsAvailable > 0) {
    const searchValue = domSearchField!.value;
    if (searchValue.trim().length === 0) {
      return;
    }
    // https://world.openfoodfacts.org/cgi/search.pl?action=process&search_terms=banane&tagtype_0=countries&tag_contains_0=contains&tag_0=de&tagtype_1=languages&tag_contains_1=contains&tag_1=de&sort_by=unique_scans_n&page_size=20
    const targetURL = new URL(
      "/cgi/search.pl?" +
        new URLSearchParams([
          ["search_terms", encodeURI(searchValue)],
          ["json", "1"],
          ["action", "process"],
          ["search_simple", "1"],
          ["tagtype_0", "countries"],
          ["tag_contains_0", "contains"],
          ["tag_0", "de"],
          ["sort_by", "unique_scans_n"],
          ["page", event === undefined ? String(initialSearchPage) : "1"],
        ]).toString(),
      API_FOOD_SEARCH_BACKEND,
    );
    const requestSettings: RequestInit = {
      cache: "force-cache",
      credentials: "omit",
      headers: {
        "User-Agent": API_USER_AGENT,
        Accept: "application/json",
      },
      method: "GET",
      mode: "cors",
      priority: "high",
      redirect: "error",
      referrerPolicy: "origin-when-cross-origin",
    };
    const hitsPromise = fetch(targetURL, requestSettings).then(
      async (response) => {
        if (response.status === 200) {
          const answer = await response.json();
          console.debug("Search response:", answer);
          latestSearchRequest = searchValue;
          hasMorePages = answer.page < answer.page_count;
          if (hasMorePages) {
            updateNextPageButtonStatus();
          }
          if (answer.products) {
            return answer.products as Product[];
          } else {
            return [];
          }
        } else {
          showToast("Unerwartete Antwort vom Suchserver");
          console.error("Unexpected search response:", response);
          return [];
        }
      },
      (reason) => {
        console.error("Search failed!", targetURL, requestSettings, reason);
        showToast("Suche fehlgeschlagen.");
        return [];
      },
    );
    recordUsage(applicableLimit, 1);
    const hits = await hitsPromise;

    // empty DOM of previous search results, if any.
    for (const prevResultDOM of Array.from(domSearchResults!.childNodes)) {
      domSearchResults!.removeChild(prevResultDOM);
    }

    for (const currentResult of hits) {
      domSearchResults!.appendChild(createSearchResultDOM(currentResult));
    }
  }
};

domFormFoodSearch!.addEventListener("submit", performSearchFn);

domSearchField!.value = initialSearchTerm.trim();
updateSearchButtonStatus();
performSearchFn();
