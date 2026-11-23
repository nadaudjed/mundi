# MUNDI — Rédaction multi-agents (V1)

## La vision demandée

**Objectif : viser 20 contenus nouveaux ou réactualisés chaque jour, sans demander au fondateur d'approuver manuellement chacun des vingt.** Une rédaction d'agents traite les 12 rubriques de MUNDI. Mais cette cible est un **objectif de production**, jamais un quota de faits inventés.

### Rôles et cadence

- **12 journalistes**, un par rubrique, chaque jour : rechercher ce qui est nouveau, retrouver les documents d'origine, identifier l'enjeu et les changements depuis une publication MUNDI antérieure.
- **12 professeurs de domaine**, dont **8 travaillent chaque jour par rotation** : approfondir une notion durable, avec un angle pédagogique et des preuves accessibles.
- **1 rédacteur en chef / vérificateur**, second appel de modèle, vérification indépendante : rechercher les éléments qui contredisent chaque assertion, examiner la date, la source, le chiffre, l'unité, le dénominateur, les droits, les red flags, et renvoyer un verdict.

Total **25 agents spécialisés configurés**, **20 missions quotidiennes** (12 journalistes + 8 professeurs) et un contrôle par article. Ce ne sont pas 25 modèles qui « tournent » en permanence : ce sont des rôles, des instructions et des traitements planifiés, ce qui limite le coût.

## Le circuit d'un sujet

`Stock privé de pistes` → `12 journalistes` / `8 professeurs` → `premier brouillon IA original` → `vérificateur IA indépendant` → `rejet / re-recherche / feu orange` → `lot éditorial prépublication`.

Le planificateur utilise :
- `editorial/agents/roster.json` pour les rôles ;
- `editorial/library/evergreen-ideas.json` pour les sujets de fond ;
- `editorial-stock:editorial/library/candidates.json` pour les pistes officielles réellement découvertes ;
- `content/publications.json` pour rechercher les sujets déjà publiés ;
- `editorial-stock:editorial/agents/ledger.json` pour éviter de relire chaque jour des pistes inchangées.

**Une rubrique sans source d'actualité réellement récente affiche `blocked_no_fresh_authorized_source`.** Elle ne reçoit pas un titre fabriqué. Les sujets de fond sont des **pistes non vérifiées** tant que le professeur n'a pas recherché des preuves.

**Actualisation :** si un flux publie à nouveau une piste reliée à une source déjà utilisée, le journaliste examine la possibilité d'une mise à jour et enregistre `previousPublication`. La signature du titre + date + URL permet aussi d'identifier un nouveau signal sur une source déjà traitée. Cela ne garantit pas de détecter les modifications silencieuses d'une page web : il faudra un moniteur de versions de sources et une file de corrections dédiée.

## Automatisation réelle et dépendances

Le workflow GitHub `MUNDI — 20 missions quotidiennes des agents (révision privée)` fonctionne **tous les jours à 08:41 UTC** et manuellement. Il s'exécute en lecture seule sur `main` et n'écrit la mémoire de la recherche que sur `editorial-stock` (branche non déployée sur Netlify).

Sans accès à un modèle, il **fonctionne en mode planification** : 20 missions, présence/absence de sources, zéro faux article.

Pour activer la rédaction et la contre-vérification, configurer dans **GitHub > Settings > Secrets and variables > Actions** :

- **Secret** `OPENAI_API_KEY` : clé de projet de l'API OpenAI, avec plafond de facturation côté fournisseur. Un abonnement ChatGPT Plus **ne comprend pas automatiquement** une allocation de crédits API.
- **Variable** `MUNDI_AGENT_MODEL` : ID d'un modèle compatible avec Responses API et web search, à choisir/tester selon qualité/coût.
- **Variable** `MUNDI_CHECKER_MODEL` : idéalement modèle de vérification distinct (facultatif, prend sinon le même).
- **Variable** `MUNDI_AGENT_MAX_JOBS` : plafond de missions réellement soumises au modèle ce jour-là, entier de 0 à 20 ; commencer à 2 avant de passer à 20.

L'API utilisée est la [Responses API](https://platform.openai.com/docs/api-reference/responses/create) et son outil [web search](https://platform.openai.com/docs/guides/tools-web-search). Les modèles renvoient du JSON, **qui doit encore être validé**. Limiter les coûts et contrôler régulièrement la facture ; 20 sujets peuvent représenter **jusqu'à 40 appels de modèle** (20 rédacteurs et 20 vérificateurs), avec des frais de recherche web en supplément, sans compter les retries.

Le workflow produit l'artefact privé `mundi-agents-daily-newsroom` (14 jours), contenant `agents-plan.json` et `agents-results.json`. **Une copie pérenne des plans, brouillons et contrôles est également archivée dans la branche séparée `editorial-stock`, au chemin `editorial/agents/days/YYYY-MM-DD.json` et `YYYY-MM-DD-plan.json`, hors Netlify**. Cette branche fait partie du dépôt privé : limiter les droits d'accès et ne pas y stocker de secrets. Chaque résultat détaille l'agent, le sujet, les sources, les assertions, leur contre-vérification, les incertitudes et les motifs de refus. **Un titre RSS seul ne constitue pas une preuve.**

## Validation et publication : phase de montée en confiance

**V1** : les agents peuvent rédiger et contre-vérifier leurs brouillons sans intervention quotidienne, mais **ne publient pas automatiquement**. Le statut positif s'appelle `machine_checked_pending_policy`, jamais `published`. Même le meilleur second modèle peut répéter les erreurs du premier ou citer une source non pertinente.

Pour la **V2 avec publication autonome à faible risque**, le circuit proposé impose :
1. Deux organismes sources **réellement indépendants**, liens accessibles et claims étayés, dates/units correctes.
2. Analyse du risque et exclusion des sujets sensibles (politique, élections, conflits, santé, finances à forts enjeux, justice, sécurité, réputation).
3. Passage des validateurs, contrôle anti-duplicata, tests CI, déploiement de prévisualisation Netlify ; audit humain **par échantillons** plutôt que validation des 20 articles.
4. Rollout progressif : 2/jour → 5/jour → 20/jour si la précision mesurée tient, avec **interrupteur d'urgence** et journal des décisions.
5. Démotion automatique d'un récit daté à actualiser quand une nouvelle source contradictoire arrive, avec rectification explicite ; jamais réécrire l'histoire silencieusement.

**Aucune approbation humaine fictive.** L'autorisation globale du fondateur permet d'organiser l'automatisation, pas de prêter à l'IA une capacité infaillible de vérifier les faits. La V2 devra définir un responsable éditorial nommé et des mécanismes de recours.

## Points de contrôle

- Ne jamais comparer 2 liens du **même organisme** comme « deux sources indépendantes ».
- Tout chiffre important a unité, période, périmètre, dénominateur et URL de preuve.
- Aucun contenu privé ne part directement dans `public/` ou `content/publications.json`.
- Les livres de cours evergreen doivent garder date de revue et faits réactualisés.
- Ne pas déclarer « 20 articles publiés » si 20 missions seulement ont été préparées.
- Vérifier régulièrement la disponibilité des flux : **les deux flux Eurostat seuls ne peuvent alimenter de manière crédible 12 domaines d'actualité** ; diversification des sources = ticket #40.
- Un rejet de vérification n'est pas automatiquement remplacé par un article plus faible pour tenir le quota.

**Ticket de coordination : [#41](https://github.com/nadaudjed/mundi/issues/41).** La bibliothèque générale reste dans [#36](https://github.com/nadaudjed/mundi/issues/36).
