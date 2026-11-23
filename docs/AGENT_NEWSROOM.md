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

**Une rubrique sans source récente dans les flux RSS reste assignée au journaliste**, avec le statut `research_required_no_lead` : il doit rechercher lui-même l'actualité du domaine sur les dernières 48 heures via web search, retrouver une source primaire et une seconde organisation indépendante. Si la recherche échoue, le brouillon est rejeté ; **aucun titre ni chiffre n'est inventé pour atteindre le quota**. La quantité de pistes RSS déjà disponibles et celle des enquêtes sans piste sont suivies séparément. Les sujets de fond sont des **pistes non vérifiées** tant que le professeur n'a pas recherché des preuves.

**Actualisation :** si un flux publie à nouveau une piste reliée à une source déjà utilisée, le journaliste examine la possibilité d'une mise à jour et enregistre `previousPublication`. La signature du titre + date + URL permet aussi d'identifier un nouveau signal sur une source déjà traitée. Cela ne garantit pas de détecter les modifications silencieuses d'une page web : il faudra un moniteur de versions de sources et une file de corrections dédiée.

## Automatisation réelle et dépendances

Le workflow GitHub `MUNDI — 20 missions quotidiennes des agents (révision privée)` fonctionne **tous les jours à 08:41 UTC** et manuellement. Il s'exécute en lecture seule sur `main` et n'écrit la mémoire de la recherche que sur `editorial-stock` (branche non déployée sur Netlify).

Sans accès à un modèle, il **fonctionne en mode planification** : 20 missions, présence/absence de sources, zéro faux article.

Pour activer la rédaction et la contre-vérification, configurer dans **GitHub > Settings > Secrets and variables > Actions** :

### Choisir Claude ou OpenAI — sans modifier le code

**Option Claude pour les journalistes et les professeurs** :

- **Secret** `ANTHROPIC_API_KEY` : créer une clé sur [Claude Console](https://platform.claude.com/) et la saisir **uniquement** dans les secrets GitHub, jamais dans un fichier ni dans un message.
- **Variable** `MUNDI_AGENT_PROVIDER` : `anthropic`.
- **Variable** `MUNDI_AGENT_MODEL` : un **ID de modèle réellement disponible sur le compte Anthropic**, compatible Messages API, recherche Web et sorties structurées ; vérifier la [liste actuelle](https://platform.claude.com/docs/en/models/overview). Exemple à vérifier selon l'accès : `claude-sonnet-5-5`.
- **Option facultative** : `MUNDI_CHECKER_PROVIDER=anthropic` (Claude vérifie Claude), ou `MUNDI_CHECKER_PROVIDER=openai` pour une vérification par un fournisseur différent.
- Si le vérificateur est OpenAI, ajouter le **secret** `OPENAI_API_KEY` et la **variable** `MUNDI_CHECKER_MODEL` contenant un modèle OpenAI ; le système **refuse** de transmettre un modèle Claude à un fournisseur OpenAI par défaut.

**Option OpenAI uniquement** :

- `MUNDI_AGENT_PROVIDER=openai` (défaut).
- Secret `OPENAI_API_KEY`, variable `MUNDI_AGENT_MODEL` avec l'ID OpenAI choisi.
- `MUNDI_CHECKER_PROVIDER` et `MUNDI_CHECKER_MODEL` facultatifs : même fournisseur/modèle par défaut.

**Budget et garde-fous communs** :

- **Variable** `MUNDI_AGENT_MAX_JOBS` : nombre de missions réellement envoyées aux modèles par jour, entier de 0 à 20 ; **défaut 2**, pour un essai à coût limité.
- La clé API Claude et l'abonnement Claude Pro/Max/Ultra/Team sont des accès distincts ; une souscription au chat ne constitue pas une clé API automatiquement exploitable par GitHub. Les crédits et conditions dépendent du forfait et de Claude Console.
- L'API Anthropic utilise [Messages API](https://platform.claude.com/docs/en/api/messages/create), le [web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) et les [sorties JSON structurées](https://platform.claude.com/docs/en/build-with-claude/structured-outputs). OpenAI conserve sa [Responses API](https://platform.openai.com/docs/api-reference/responses/create).
- Le rédacteur et le vérificateur effectuent deux appels de modèle distincts. Claude est rejeté par le moteur si aucune recherche Web effective n'a été réalisée, si la recherche signale une erreur ou si le JSON est incomplet ; des sources citées doivent encore être contrôlées.
- La séparation entre fournisseurs réduit certaines erreurs corrélées, **sans garantir l'exactitude**. Un article rejeté n'est jamais automatiquement publié.
- Pour 20 sujets, prévoir **jusqu'à 40 appels de modèle**, les recherches Web supplémentaires et le risque de dépassement des limites de facturation. Sur Claude, le web search est facturé séparément des tokens ; consulter le [tarif officiel](https://platform.claude.com/docs/en/about-claude/pricing).

**Exemple mixte recommandé pour le pilote :** Claude Sonnet comme rédacteur/professeur et un modèle OpenAI comme vérificateur, avec `MUNDI_AGENT_MAX_JOBS=2`. Une configuration « Claude pour les deux rôles » reste possible si on ne veut pas utiliser deux fournisseurs.

Le workflow produit l'artefact privé `mundi-agents-daily-newsroom` (14 jours), contenant `agents-plan.json` et `agents-results.json`. **Une copie pérenne des plans, brouillons et contrôles est également archivée dans la branche séparée `editorial-stock`, au chemin `editorial/agents/days/YYYY-MM-DD.json` et `YYYY-MM-DD-plan.json`, hors Netlify**. Cette branche fait partie du dépôt privé : limiter les droits d'accès et ne pas y stocker de secrets. Chaque résultat détaille l'agent, le sujet, les sources, les assertions, leur contre-vérification, les incertitudes et les motifs de refus. **Un titre RSS seul ne constitue pas une preuve.**

## Publication automatique (V2, activée le 23/11/2026 à la demande du fondateur)

Le fondateur a demandé que le vérificateur publie seul, sans relecture humaine quotidienne. Le même jour, il a levé l'exclusion des sujets sensibles : « on parle de tout sans tabou tant que c'est sourcé ». `scripts/autopublish-agents.mjs` s'exécute à la fin du workflow et ne publie un brouillon que si **toutes** les conditions sont réunies :
- statut `machine_checked_pending_policy` : validation déterministe, verdict `pass` du vérificateur, chaque affirmation étayée ;
- tous les sujets sont admis. Sur les sujets sensibles (élections, conflits, santé, justice, finance, migration, religion), le vérificateur applique des règles renforcées : faits attribués, parties présentées sans parti pris, aucune accusation non établie, aucun conseil médical ou financier. Sinon, verdict `needs_review` ;
- au plus 5 incertitudes relevées ;
- au moins deux organismes sources différents, et **chaque lien répond réellement** (contrôlé par le script, pas par l'IA) ;
- pas de doublon (titre, adresse ou ensemble de sources déjà publiés) ;
- au plus `MUNDI_AUTOPUBLISH_MAX` publications par jour (défaut 2, maximum 5).

La publication est validée (`validate-editorial`), construite (`next build`) puis poussée sur `main` ; Netlify la met en ligne. Elle porte `aiVerified: true` et le site affiche « vérifié par l'IA, sans relecture humaine » : aucune relecture humaine n'est jamais prétendue. Les missions alternent reporters et professeurs ; `MUNDI_AGENT_MAX_JOBS` vaut 6 par défaut.

**Interrupteur d'urgence** : variable de dépôt `MUNDI_AUTOPUBLISH=off` (Settings → Secrets and variables → Actions → Variables). **Retirer un article** : supprimer son entrée de `content/publications.json`. Les audits par échantillons et les indicateurs de #43 restent à mettre en place.

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
