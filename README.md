# BonPlan

Site qui prend un budget, des goûts (catégorie, mots-clés, tags) et fait une
vraie recherche de prix sur les 3 catégories (livres, jeux vidéo, consoles)
via l'API **Gemini** (Google AI Studio) avec son outil de recherche Google
intégré (grounding) — gratuite, sans carte bancaire, mais nécessite une clé
API (voir configuration ci-dessous).

La recherche se fait côté serveur dans une fonction Netlify
(`netlify/functions/search.js`), pour ne jamais exposer la clé au
navigateur.

## Configurer la clé Gemini (gratuite, sans carte)

1. Va sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   et connecte-toi avec un compte Google.
2. Clique "Create API key" → choisis ou crée un projet Google Cloud (pas
   besoin d'associer de carte bancaire pour le quota gratuit de Gemini).
3. Copie la clé générée.
4. Sur [app.netlify.com](https://app.netlify.com) → le site `bonplan` →
   **Project configuration** → **Environment variables** → ajoute :
   - `GEMINI_API_KEY` = ta clé (coche "Contains secret values")
5. Redéploie le site (Deploys → Trigger deploy).

⚠️ Ne mets jamais de clé API dans le code ou sur GitHub — uniquement dans
les variables d'environnement Netlify.

## Lancer en local (avec la recherche fonctionnelle)

Les fonctions Netlify ne marchent pas avec un simple `file://` ou un serveur
statique basique. Utilise la CLI Netlify :

```bash
npm install -g netlify-cli
netlify dev
```

Crée un fichier `.env` local (non commité, déjà dans `.gitignore`) avec :

```
GEMINI_API_KEY=ta_clé
```

## Déploiement

Le site se redéploie automatiquement à chaque `git push` sur `main` (déjà
connecté à Netlify via GitHub).

## Limites connues

- Gemini peut occasionnellement mal interpréter une recherche ou renvoyer
  un format inattendu — le site l'indique clairement plutôt que d'afficher
  des données fausses silencieusement.
- La "fiabilité" est une liste de boutiques connues par catégorie
  (`TRUSTED_DOMAINS` dans `netlify/functions/search.js`), pas une vraie
  note de confiance.
- Toujours vérifier le prix sur le site du vendeur avant d'acheter.
- Quota gratuit Gemini partagé entre les 3 catégories : si tu cherches
  beaucoup, tu peux atteindre la limite journalière/minute du plan gratuit
  (le site affichera l'erreur renvoyée par Gemini le cas échéant).
