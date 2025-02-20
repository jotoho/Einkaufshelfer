// SPDX-License-Identifier: CC0-1.0
// SPDX-FileCopyrightText: 2025 Jonas Tobias Hopusch <git@jotoho.de>

import { resolve } from "path";
import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';
import { stripHTMLComments } from "@zade/vite-plugin-strip-html-comments";
import { execSync } from "node:child_process";

export default defineConfig({
	plugins: [injectHTML(), stripHTMLComments()],
	build: {
		rollupOptions: {
			input: {
				essenssuche: resolve(__dirname, '/essensuche.html'),
				index: resolve(__dirname, '/index.html'),
				login: resolve(__dirname, '/login.html'),
				uebersicht: resolve(__dirname, '/uebersicht.html'),
				registration: resolve(__dirname, '/registration.html'),
				settings: resolve(__dirname, '/settings.html'),
				liste: resolve(__dirname, '/liste.html'),
			},
		},
		target: 'es2024',
		sourcemap: true,
	},
	define: {
		EINKAUFSLISTE_VERSION: JSON.stringify(execSync("git describe --dirty --broken --tags --always").toString("utf8").trim() ?? "unknown-version"),
	},
});
