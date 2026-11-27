#!/usr/bin/env bash
# MUNDI — accès au stock éditorial privé (brouillons, vérifications, registre des recherches).
#
# Le stock vit dans un dépôt privé séparé (MUNDI_STOCK_REPO, défaut nadaudjed/mundi-stock), branche
# editorial-stock, pour que le dépôt du site puisse être public. Ce script crée le remote git « stock »
# utilisé par les workflows. Avec le secret MUNDI_STOCK_TOKEN (clé limitée au dépôt du stock), il pointe
# vers ce dépôt privé. Sans le secret, il pointe vers le dépôt courant (ancien fonctionnement, branche
# editorial-stock du même dépôt), pour que rien ne casse avant la bascule.
set -euo pipefail
REPO="${MUNDI_STOCK_REPO:-nadaudjed/mundi-stock}"
git remote remove stock 2>/dev/null || true
if [ -n "${MUNDI_STOCK_TOKEN:-}" ]; then
  echo "::add-mask::$MUNDI_STOCK_TOKEN"
  URL="https://github.com/$REPO.git"
  git remote add stock "$URL"
  # actions/checkout ajoute un en-tête d'authentification pour tout github.com (jeton du dépôt du site).
  # Git cumule les en-têtes : une valeur vide, propre à l'adresse du stock, vide la liste, puis la clé du
  # stock est ajoutée. Sans cette remise à zéro, GitHub refuse la requête (« Duplicate header »).
  AUTH=$(printf 'x-access-token:%s' "$MUNDI_STOCK_TOKEN" | base64 -w0)
  echo "::add-mask::$AUTH"
  git config --unset-all "http.$URL/.extraheader" 2>/dev/null || true
  git config --add "http.$URL/.extraheader" ""
  git config --add "http.$URL/.extraheader" "AUTHORIZATION: basic $AUTH"
  echo "Stock éditorial : dépôt privé $REPO."
else
  git remote add stock "$(git remote get-url origin)"
  echo "::warning::Secret MUNDI_STOCK_TOKEN absent : stock lu dans la branche editorial-stock de ce dépôt (à ne pas rendre public)."
fi
