// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

import {
  Client,
  Account,
  Databases,
  Teams,
  ID,
  Permission,
  Role,
} from "appwrite";
import { CONFIG } from "./config.ts";
import { showToast } from "./notifications.ts";
import type { Einkaufsliste, Listeneintrag } from "./types.ts";

const client = new Client()
  .setEndpoint(CONFIG.BACKEND_ENDPOINT)
  .setProject(CONFIG.PROJECT_ID);
const accountAPI = new Account(client);

await accountAPI.get().catch(() => {
  console.error("User is not logged in! Redirecting...");
  window.location.pathname = "/login.html";
});

const openLists = document.querySelector(
  "main#pagemain > ul.shoppinglists.open",
);
const doneLists = document.querySelector(
  "main#pagemain > ul.shoppinglists.done",
);

const buttonGotoSearch = document.querySelector<HTMLButtonElement>(
  "main > button#gotoFoodSearch",
);

console.assert(openLists !== null);
console.assert(doneLists !== null);
if (openLists === null || doneLists === null) {
  throw "Malformed HTML";
}

const deleteListFn = async (listen_id: string, domElement: HTMLElement) => {
  db.deleteDocument(
    CONFIG.DATABASE_ID,
    CONFIG.DB_COLLECTION_SHOPPINGLISTS,
    listen_id,
  ).then(
    () => {
      domElement.remove();
    },
    () => {
      showToast("Löschen schiefgelaufen!");
    },
  );
};

const generateListRepresentation = async (liste: Einkaufsliste) => {
  const result = document.createElement("li");
  const einträge = liste.listeneintrag as Listeneintrag[];
  const stichtag_localized = new Date(liste.stichtag).toLocaleDateString(
    "de-DE",
    {
      dateStyle: "long",
    },
  );
  result.style.cssText =
    "order: " + Math.floor(new Date(liste.stichtag).getTime() / 3_600_000);
  result.innerHTML = `
    <a href="/liste.html?id=${liste.$id}" >
      <h4 class="listname">${liste.beschriftung}</h4>
      <span class="household">${(await teams.get(liste.ID_Household)).name}</span>
      <time datetime="${liste.stichtag}">${stichtag_localized}</time>
      <progress max="${einträge.length}"
                value="${einträge.filter((listeneintrag) => listeneintrag.erledigt).length}">
      </progress>
    </a>
    <button class="listDeletor">🗑</button>
  `;
  result
    .querySelector("button.listDeletor")
    ?.addEventListener?.("click", deleteListFn.bind(null, liste!.$id!, result));
  return result;
};

const teams = new Teams(client);
const documentProcessor = async (doc: Einkaufsliste) => {
  console.debug(doc);
  const listOfLists = doc.listeneintrag as Listeneintrag[];
  const isDone =
    listOfLists.every((liste) => liste.erledigt) && listOfLists.length > 0;
  (isDone ? doneLists : openLists).appendChild(
    await generateListRepresentation(doc),
  );
};

const db = new Databases(client);
const shoppingLists = (
  await db.listDocuments(CONFIG.DATABASE_ID, CONFIG.DB_COLLECTION_SHOPPINGLISTS)
).documents as Einkaufsliste[];
shoppingLists.forEach(documentProcessor);

const dateFormField: HTMLInputElement | null = document.querySelector(
  "input[type=date]#new-list-date",
);
if (dateFormField) {
  dateFormField.min = new Date(new Date().setDate(new Date().getDate() - 1))
    .toISOString()
    .split("T")[0];
  dateFormField.max = new Date(
    new Date().setFullYear(new Date().getFullYear() + 1),
  )
    .toISOString()
    .split("T")[0];
}

const teamsSelect = document.getElementById("teams-select");
if (teamsSelect) {
  const teamsResponse = await teams.list();
  teamsResponse.teams.forEach(async (team) => {
    const option = document.createElement("option");
    option.value = team.$id;
    option.innerText = team.name;
    teamsSelect.appendChild(option);
  });
}

const createNewList = (event: HTMLElementEventMap["click"]) => {
  event.preventDefault();
  const newList: Einkaufsliste = {
    ID_Household: (document.getElementById("teams-select") as HTMLSelectElement)
      .value,
    stichtag: new Date(
      (document.getElementById("new-list-date") as HTMLInputElement).value,
    ).toISOString(),
    beschriftung:
      (
        document.querySelector(
          "form#new-list-form > input[name=listname]",
        ) as HTMLInputElement
      )?.value ?? "",
    beschreibung: "",
    listeneintrag: [],
  };

  db.createDocument(
    CONFIG.DATABASE_ID,
    CONFIG.DB_COLLECTION_SHOPPINGLISTS,
    ID.unique(),
    newList,
    [
      Permission.read(Role.team(newList.ID_Household)),
      Permission.update(Role.team(newList.ID_Household)),
      Permission.delete(Role.team(newList.ID_Household)),
    ],
  ).then(
    () => window.location.reload(),
    () => {
      window.alert("Die geforderte Liste konnte nicht erstellt werden. :(");
    },
  );
};

document
  .getElementById("new-list-submitter")
  ?.addEventListener("click", createNewList);

if (buttonGotoSearch) {
  buttonGotoSearch.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      window.location.pathname = "/essensuche.html";
    },
    { once: true },
  );
}
