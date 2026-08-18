# BonPlan (prototype)

Site qui prend un budget, des goûts (catégorie, mots-clés, tags) et affiche le
meilleur rapport prix / fiabilité **parmi des données simulées** (`data.js`).
Aucune recherche internet réelle n'est faite pour l'instant.

## Lancer en local

Ouvre simplement `index.html` dans un navigateur, ou sers le dossier avec
n'importe quel serveur statique (ex: `npx serve .`).

## Déployer sur Netlify (via GitHub)

1. Crée un dépôt GitHub et pousse ce dossier dedans.
2. Sur [netlify.com](https://netlify.com), "Add new site" → "Import from Git" → choisis le dépôt.
3. Aucune commande de build n'est nécessaire (site 100% statique) :
   - Build command : *(laisser vide)*
   - Publish directory : `.`
4. Déployer — Netlify redéploiera automatiquement à chaque `git push`.

## Prochaine étape : brancher une vraie recherche

Pour remplacer `data.js` par de vrais résultats internet, il faudra une API
de recherche/comparateur de prix, par exemple :

- **SerpAPI** (Google Shopping) — payant, résultats riches
- **Google Custom Search API** — quota gratuit limité, puis payant
- **Bing Web Search API** — payant

Cela nécessite une petite fonction backend (ex: une Netlify Function) qui
appelle l'API avec une clé secrète, car ces clés ne doivent jamais être
exposées côté navigateur.
