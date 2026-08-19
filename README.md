# BonPlan

Site qui prend un budget, des goûts (catégorie, mots-clés, tags) et fait une
recherche de prix réels. Actuellement, seule la catégorie **Jeux vidéo**
a une vraie recherche : via l'API gratuite **CheapShark**, qui compare les
prix sur Steam, GOG, Epic Games Store, Humble Store, etc. — sans clé API,
sans compte, sans carte bancaire.

Livres et consoles n'ont pas encore d'équivalent gratuit sans carte
bancaire (voir "Aller plus loin" ci-dessous).

La recherche se fait côté serveur dans une fonction Netlify
(`netlify/functions/search.js`).

## Lancer en local (avec la recherche fonctionnelle)

Les fonctions Netlify ne marchent pas avec un simple `file://` ou un serveur
statique basique. Utilise la CLI Netlify :

```bash
npm install -g netlify-cli
netlify dev
```

Aucune clé API n'est nécessaire pour CheapShark : la recherche jeux vidéo
fonctionne directement, en local comme en production.

## Déploiement

Le site se redéploie automatiquement à chaque `git push` sur `main` (déjà
connecté à Netlify via GitHub).

## Limites connues

- Recherche réelle limitée à la catégorie **Jeux vidéo** pour l'instant.
- Les prix CheapShark sont en **dollars ($)**, pas en euros (l'API ne
  propose pas de conversion).
- La "fiabilité" est une simple liste de boutiques connues
  (`TRUSTED_STORE_IDS` dans `netlify/functions/search.js`), pas une vraie
  note de confiance.

## Aller plus loin : livres et consoles

Pour une vraie recherche sur ces catégories, l'option la plus complète est
l'API **Google Custom Search** (recherche web générale, 100 requêtes/jour
gratuites). Mais Google exige d'associer une carte bancaire au projet
Google Cloud pour activer cette API, même si l'usage reste gratuit sous le
quota. Si tu veux franchir cette étape un jour :

1. [console.cloud.google.com](https://console.cloud.google.com/) → active
   "Custom Search API" → associe une carte bancaire (Facturation).
2. Crée une clé API dans "Identifiants".
3. Crée un moteur sur [programmablesearchengine.google.com](https://programmablesearchengine.google.com/controlpanel/create)
   (laisser "sites à rechercher" vide = recherche tout le web), récupère
   son ID (cx).
4. Ajoute `GOOGLE_SEARCH_API_KEY` et `GOOGLE_SEARCH_CX` dans les variables
   d'environnement Netlify, jamais dans le code.

⚠️ Ne mets jamais de clé API dans le code ou sur GitHub — uniquement dans
les variables d'environnement Netlify.
