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
import { existsSync, renameSync, rmSync } from "node:fs";

const FIXTURES = "tests/fixtures/publications.fixture.json";
const run = (env = {}) => execSync("npx next build", { stdio: "inherit", env: { ...process.env, ...env } });

rmSync("out-fixtures", { recursive: true, force: true });
run({ MUNDI_TEST_PUBLICATIONS: FIXTURES });
renameSync("out", "out-fixtures");
run();
if (!existsSync("out/index.html")) throw new Error("Le site normal n'a pas été construit.");
