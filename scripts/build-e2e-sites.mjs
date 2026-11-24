#!/usr/bin/env node
/**
 * Construit les deux sites utilisés par les tests de bout en bout :
 * 1. out-fixtures/ : avec les publications INVENTÉES de tests/fixtures/
 *    (jamais déployé : ce dossier est ignoré par Git et par Netlify) ;
 * 2. out/          : le site normal, identique à celui que publie Netlify.
 * Le site normal est construit en dernier pour que out/ ne contienne
 * jamais de données de test.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";

const FIXTURES = "tests/fixtures/publications.fixture.json";
/** Registre de fonds INVENTÉS (ticket #30) : seul le site de test les reçoit. */
const SCENES = "tests/fixtures/scenes.fixture.json";
const run = (env = {}) => execSync("npx next build", { stdio: "inherit", env: { ...process.env, ...env } });

rmSync("out-fixtures", { recursive: true, force: true });
run({ MUNDI_TEST_PUBLICATIONS: FIXTURES, MUNDI_TEST_SCENES: process.env.MUNDI_TEST_SCENES ?? SCENES, MUNDI_TEST_AUDIO: "tests/fixtures/article-audio.fixture.json" });
renameSync("out", "out-fixtures");
// Les fichiers des fonds de test ne sont copiés que dans le site de test, jamais dans public/.
cpSync(process.env.MUNDI_TEST_SCENES_DIR ?? "tests/fixtures/scenes", "out-fixtures/media/scenes", { recursive: true });
// Version audio INVENTÉE (un simple bip) : seulement dans le site de test.
cpSync("tests/fixtures/audio", "out-fixtures/media/audio", { recursive: true });
run();
if (!existsSync("out/index.html")) throw new Error("Le site normal n'a pas été construit.");
