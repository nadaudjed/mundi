#!/usr/bin/env bash
# MUNDI (#125) — écriture sur main des publications d'un lot, avec recontrôle juste avant l'écriture.
#
# Le lot (reports/autopublish.json, champ items) est rejoué sur le main le plus récent à chaque
# tentative : si un autre lot a été publié entre la vérification et l'écriture, ses articles sont
# comparés à leur tour (scripts/catalogue-insert.mjs). Plus de « git pull --rebase » sur le JSON,
# qui fusionnait deux lots concurrents sans contrôle. Rejouer le même lot ne crée rien.
#   scripts/publish-to-main.sh "<message de commit>"
set -euo pipefail
LOT="${MUNDI_BATCH:-reports/autopublish.json}"
MESSAGE="${1:-agents: publication automatique}"
for attempt in 1 2 3 4; do
  git fetch -q origin main
  # Repart du main le plus récent (reports/, ignoré par git, est conservé).
  git checkout -q --detach
  git reset -q --hard origin/main
  node scripts/catalogue-insert.mjs "$LOT" --report reports/insertion.json
  if git diff --quiet -- content/publications.json; then
    echo "Rien de nouveau à publier : déjà présent ou en attente (voir reports/insertion.json)."
    exit 0
  fi
  node scripts/validate-editorial.mjs
  git add content/publications.json
  git commit -q -m "$MESSAGE ($(node -p "require('./reports/insertion.json').inserted.join(', ')"))"
  if git push origin HEAD:main; then exit 0; fi
  echo "Main a changé pendant l'écriture : nouvelle tentative $((attempt + 1)) avec recontrôle."
  sleep $((attempt * 5))
done
echo "::error::Publication non écrite après 4 tentatives."
exit 1
