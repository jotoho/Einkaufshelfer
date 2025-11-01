// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Tim Beckmann <beckmann.tim@fh-swf.de>

import {
    Client,
    Databases,
    ID,
    Permission,
    RealtimeResponseEvent,
    Teams,
    Role,
    Query,
    Models,
} from 'appwrite';
import { CONFIG } from './config.ts';
import type {
    Einkaufsliste,
    Listeneintrag
} from './types.ts';
import './notifications.ts';
import { showToast } from './notifications.ts';

const client = new Client();

const teams = new Teams(client);

client
    .setEndpoint(CONFIG.BACKEND_ENDPOINT)
    .setProject(CONFIG.PROJECT_ID);

const database = new Databases(client);

const urlParams = new URLSearchParams(window.location.search);

const listid = urlParams.get('id');

if (listid == null) {
    window.location.href = '/uebersicht.html';
}

let currentRelations = new Map<string, string>();

const deadline = document.querySelector('input#deadline') as HTMLInputElement;
const quantity = document.querySelector('input#quantity') as HTMLInputElement;
const listTitel = document.querySelector('input#listTitel') as HTMLInputElement;
const productName = document.querySelector('input#productName') as HTMLInputElement;
const newProductForm = document.querySelector('form#newProduct') as HTMLFormElement;
const productTable = document.querySelector('table#productTable') as HTMLTableElement;
const deleteListButton = document.querySelector('button#deleteListButton') as HTMLButtonElement;
const listDescription = document.querySelector('textarea#listDescription') as HTMLTextAreaElement;
const editDescriptionButton = document.querySelector('button#editDescriptionButton') as HTMLButtonElement;

const shoppinglist = database.getDocument<Einkaufsliste & Models.Document>({
    databaseId: CONFIG.DATABASE_ID,
    collectionId: CONFIG.DB_COLLECTION_SHOPPINGLISTS,
    documentId: listid!,
    queries: [Query.select(["*", "einkaufslisten"])],
}) as Promise<Einkaufsliste>;

shoppinglist.then(async (list) => {
    setPageTitle(list);

    realtimeUpdate(list);

    updateListInfo(list);

    editDescriptionButton.addEventListener('click', () => {
        if (!listDescription.readOnly) {
            database.updateDocument(
                CONFIG.DATABASE_ID,
                CONFIG.DB_COLLECTION_SHOPPINGLISTS,
                list.$id!,
                {
                    stichtag: deadline.value,
                    beschriftung: listTitel.value,
                    beschreibung: listDescription.value
                }
            );
        }
        listTitel.readOnly = !listTitel.readOnly;
        listDescription.readOnly = !listDescription.readOnly;
        deadline.readOnly = !deadline.readOnly;
    });

    deleteListButton.addEventListener('click', () => {
        database.deleteDocument(CONFIG.DATABASE_ID,
            CONFIG.DB_COLLECTION_SHOPPINGLISTS,
            listid!).then(
                () => {
                    window.location.href = '/uebersicht.html';
                },
                () => { showToast('Die Liste konnte nicht gelöscht werden. :(') }
            )
    });

    newProductForm.addEventListener('submit', (event) => {
        event.preventDefault();

        type newListeneintrag = Omit<Listeneintrag, "einkaufslisten"> & { einkaufslisten: string };

        const product: newListeneintrag = {
            artikelname: productName.value,
            anzahl: Number.parseInt(quantity.value),
            erledigt: false,
            einkaufslisten: list.$id!
        }

        database.createDocument(
            CONFIG.DATABASE_ID,
            CONFIG.DB_COLLECTION_SHOPLISTENTRY,
            ID.unique(),
            product,
            [
                Permission.read(Role.team(list.ID_Household)),
                Permission.update(Role.team(list.ID_Household)),
                Permission.delete(Role.team(list.ID_Household)),
            ],
        ).then((newEntry) => {
            currentRelations.set(newEntry.$id!, listid!);
        },
            () => { showToast('Das geforderte Produkt konnte nicht erstellt werden. :(') });
    });

    list.listeneintrag.forEach(function (value: Listeneintrag) {
        addRowToTable(value);
    });
}, () => {
    window.location.href = '/uebersicht.html';
});

function createTableRow(data: Listeneintrag): HTMLTableRowElement {
    const row = document.createElement('tr');
    let elements = new Array<HTMLElement>();

    row.setAttribute('id', 'id-' + data.$id!);

    const checkbox = document.createElement('input');
    checkbox.name = "checkbox";
    checkbox.type = 'checkbox';
    checkbox.checked = data.erledigt;
    checkbox.addEventListener('change', async () => {
        data.erledigt = Boolean(checkbox.checked);
        await updateListEntry(data);
    });
    elements.push(checkbox);

    const productName = document.createElement('input');
    productName.name = "productName";
    productName.type = 'text';
    productName.readOnly = true;
    productName.value = data.artikelname;
    elements.push(productName);

    const quantity = document.createElement('input');
    quantity.name = "quantity";
    quantity.type = 'number';
    quantity.min = '1';
    quantity.max = '999';
    quantity.value = String(data.anzahl);
    quantity.readOnly = true;
    elements.push(quantity);

    const editButton = document.createElement('button');
    editButton.innerHTML = '&#9998';
    elements.push(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#x1F5D1;';
    elements.push(deleteButton);

    deleteButton.addEventListener('click', async (event) => {
        event.preventDefault();
        database.deleteDocument(
            CONFIG.DATABASE_ID,
            CONFIG.DB_COLLECTION_SHOPLISTENTRY,
            data.$id!
        ).then(() => { },
            () => {
                showToast('Das ausgewählte Produkt konnte nicht gelöscht werden. :(');
            });
    });

    editButton.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!productName.readOnly) {
            data.anzahl = Number.parseInt(quantity.value);
            data.artikelname = productName.value;
            await updateListEntry(data);
        }
        productName.readOnly = !productName.readOnly;
        quantity.readOnly = !quantity.readOnly;
    });

    elements.forEach((element) => {
        addToRow(element, row);
    })

    return row;
}

function addToRow(element: HTMLElement, row: HTMLTableRowElement) {
    const td = document.createElement('td');
    td.appendChild(element);
    row.appendChild(td);
}

function addRowToTable(newEntry: Listeneintrag) {
    currentRelations.set(newEntry.$id!, listid!);
    productTable.appendChild(createTableRow(newEntry));
}

function realtimeUpdate(list: Einkaufsliste) {
    const listChannel = 'databases.' + CONFIG.DATABASE_ID +
        '.collections.' + CONFIG.DB_COLLECTION_SHOPPINGLISTS +
        '.documents.' + list.$id!;
    const listeneintragChannel = 'databases.' + CONFIG.DATABASE_ID +
        '.collections.' + CONFIG.DB_COLLECTION_SHOPLISTENTRY +
        '.documents';
    client.subscribe([listChannel, listeneintragChannel], response => {
        if (response.channels.includes(listChannel)) {
            const changedList = response.payload as Einkaufsliste;
            updateListInfo(changedList);
        }
        if (response.channels.includes(listeneintragChannel)) {
            documentEventHandler(response);
        }
    });
}

function documentEventHandler(response: RealtimeResponseEvent<unknown>) {
    const changedEntry = response.payload as Listeneintrag;
    if (currentRelations.get(changedEntry.$id!) != listid) {
        return;
    }
    const event = response.events[0];
    if (event) {
        switch (true) {
            case /create$/.test(event):
                addRowToTable(changedEntry);
                console.log("It creates!");
                break;
            case /delete$/.test(event):
                deleteRow(changedEntry);
                console.log("It deletes!");
                break;
            case /update$/.test(event):
                updateRowEntry(changedEntry);
                console.log("It updates!");
                break;
            default:
                break;
        }
    }

}

function deleteRow(entry: Listeneintrag) {
    document.querySelector("#id-" + entry.$id)?.remove?.();
    currentRelations.delete(entry.$id!);
}

function updateRowEntry(entry: Listeneintrag) {
    const checkbox = document.querySelector('tr#id-' + entry.$id! + ' > td > input[name="checkbox"]') as HTMLInputElement;
    checkbox.checked = entry.erledigt;

    const name = document.querySelector('tr#id-' + entry.$id! + ' > td > input[name=productName]') as HTMLInputElement;
    name.value = entry.artikelname;

    const quantity = document.querySelector('tr#id-' + entry.$id! + '> td > input[name=quantity]') as HTMLInputElement;
    quantity.value = String(entry.anzahl);
}

async function updateListEntry(entry: Listeneintrag) {
    database.updateDocument(
        CONFIG.DATABASE_ID,
        CONFIG.DB_COLLECTION_SHOPLISTENTRY,
        entry.$id!,
        {
            erledigt: entry.erledigt,
            artikelname: entry.artikelname,
            anzahl: entry.anzahl
        }
    );
}

function updateListInfo(list: Einkaufsliste) {
    listTitel.value = list.beschriftung;
    deadline.value = list.stichtag.split('T')[0]!;
    listDescription.value = list.beschreibung;
}

async function setPageTitle(list: Einkaufsliste) {
    const team = await teams.get(list.ID_Household).then(team => team, () => null);
    const teamName = team!.name;
    document.title = list.stichtag.split('T')[0] + ' ' + list.beschriftung + ' ' + teamName + ' | EinkaufsApp';
}
