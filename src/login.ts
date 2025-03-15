// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2025 Tim Beckmann <beckmann.tim@fh-swf.de>

import { Client, Account, OAuthProvider } from "appwrite";
import { CONFIG } from './config.ts';

const client: Client = new Client();

client
    .setEndpoint(CONFIG.BACKEND_ENDPOINT)
    .setProject(CONFIG.PROJECT_ID);

const account: Account = new Account(client);

const email = <HTMLInputElement>document.getElementById("email");
const password = <HTMLInputElement>document.getElementById("password");
const errorField = <HTMLDivElement>document.getElementById("error");
const loginButton = <HTMLButtonElement>document.getElementById("loginButton");
const ssoLoginButton = document.querySelector<HTMLButtonElement>("button#buttonSSOLogin");

isUserLoggedIn().then((isLoggedIn) => {
    if (!isLoggedIn) {
        return;
    }

    email.disabled = true;
    password.disabled = true;
    loginButton.disabled = true;
    if (ssoLoginButton) {
        ssoLoginButton.disabled = true;
    }

    errorField.innerHTML = `
        <p>Sie sind bereits angemeldet!<br />
        Sie werden in Kürze weitergeleitet.</p>
    `;
    setTimeout(
        ()=>{
            window.location.pathname = "/uebersicht.html";
        },5000
    )
})

loginButton.addEventListener('click', (event) => {
    event.preventDefault();
    login();
})

const form = <HTMLInputElement>document.getElementById("loginForm");
form.addEventListener('submit', (event) => {
    event.preventDefault();
})

function login() {
    const promise = account.createEmailPasswordSession(email.value, password.value);

    promise.then(function (response) {
        console.log(response);
        window.location.pathname = "/uebersicht.html";
    }, function (error) {
        console.log(error);
        errorField.innerHTML = `
        <p>Passwort oder E-Mail sind falsch!</p>
    `;
    })
}

async function isUserLoggedIn(): Promise<boolean> {
    try {
        await account.get();
    } catch {
        return false;
    }
    return true;
}

if (ssoLoginButton) {
    ssoLoginButton.addEventListener("click", async (event) => {
        event.preventDefault();
        await account.createOAuth2Session(
            OAuthProvider.Oidc,
            document.location.origin + "/oidc/success.html",
            document.location.origin + "/oidc/failure.html"
        );
    }, { once: true });
}
