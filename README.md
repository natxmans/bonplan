# BonPlan

Site qui prend un budget, des goûts (catégorie, mots-clés, tags) et fait une
**vraie recherche sur internet** via l'API gratuite Google Custom Search,
puis affiche les résultats triés par prix détecté (le moins cher parmi les
sites marchands reconnus en premier).

La recherche se fait côté serveur dans une fonction Netlify
(`netlify/functions/search.js`) pour que la clé API ne soit jamais exposée
dans le navigateur.

## 1. Obtenir la clé API Google (gratuite, 100 requêtes/jour)

1. Va sur [console.cloud.google.com](https://console.cloud.google.com/) et
   crée un projet (gratuit, pas de carte bancaire nécessaire pour ce quota).
2. Dans "API et services" → "Bibliothèque", active **"Custom Search API"**.
3. Dans "API et services" → "Identifiants", crée une **clé API**. C'est ta
   valeur `GOOGLE_SEARCH_API_KEY`.
4. Va sur [programmablesearchengine.google.com](https://programmablesearchengine.google.com/controlpanel/create),
   crée un moteur de recherche qui cherche sur **tout le web** (pas un site
   précis). Récupère son **ID du moteur de recherche** (cx). C'est ta valeur
   `GOOGLE_SEARCH_CX`.

## 2. Configurer les clés sur Netlify

Sur [app.netlify.com](https://app.netlify.com) → ton site `bonplan` →
**Project configuration** → **Environment variables** → ajoute :

- `GOOGLE_SEARCH_API_KEY` = ta clé API
- `GOOGLE_SEARCH_CX` = ton ID de moteur de recherche

Puis redéploie le site (Deploys → Trigger deploy) pour que les fonctions
prennent en compte les nouvelles variables.

⚠️ Ne mets jamais ces valeurs dans le code ou sur GitHub — uniquement dans
les variables d'environnement Netlify.

## Lancer en local (avec la recherche fonctionnelle)

Les fonctions Netlify ne marchent pas avec un simple `file://` ou un serveur
statique basique. Utilise la CLI Netlify :

```bash
npm install -g netlify-cli
netlify dev
```

Crée un fichier `.env` local (non commité) avec :

```
GOOGLE_SEARCH_API_KEY=ta_clé
GOOGLE_SEARCH_CX=ton_cx
```

## Déploiement

Le site se redéploie automatiquement à chaque `git push` sur `main` (déjà
connecté à Netlify via GitHub).

## Limites connues

- Quota Google gratuit : 100 requêtes/jour. Au-delà, la recherche échoue
  jusqu'au lendemain (ou passage à un plan payant).
- Le prix est **détecté par une expression régulière** dans les résultats
  Google (titre/description) : il peut être absent, faux, ou obsolète.
  Toujours vérifier sur le site avant d'acheter.
- La "fiabilité" est une simple liste de sites marchands connus
  (`netlify/functions/search.js`), pas une vraie note de confiance.
