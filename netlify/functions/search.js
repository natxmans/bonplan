// Fonction serverless Netlify : vraie recherche de prix pour les 3
// catégories (livres, jeux vidéo, consoles) via l'API Gemini avec son
// outil "Google Search" (grounding), qui cherche réellement sur le web
// puis renvoie une liste structurée. Gratuite via Google AI Studio, sans
// carte bancaire — voir README pour la configuration.

const TRUSTED_DOMAINS = {
  livres: ["fnac.com", "cultura.com", "decitre.fr", "leslibraires.fr", "amazon.fr", "momox-shop.fr", "rakuten.com"],
  jeux: [
    "store.steampowered.com",
    "gog.com",
    "epicgames.com",
    "instant-gaming.com",
    "fnac.com",
    "micromania.fr",
    "cdiscount.com",
    "amazon.fr",
    "eneba.com",
  ],
  consoles: [
    "fnac.com",
    "micromania.fr",
    "cdiscount.com",
    "amazon.fr",
    "boulanger.com",
    "darty.com",
    "rakuten.com",
    "auchan.fr",
    "leclerc.fr",
  ],
};

const CATEGORY_LABELS = {
  livres: "livre",
  jeux: "jeu vidéo",
  consoles: "console de jeux vidéo",
};

// Gemini est censé renvoyer un nombre JSON (19.99), mais un LLM peut parfois
// s'écarter du format demandé et renvoyer une chaîne au format français
// (ex: "19,99"). On tente de récupérer ce cas plutôt que de perdre le prix.
function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!/\d/.test(normalized)) return null; // "" (ex: "gratuit") sinon Number("") vaut 0
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isKnownDomain(url, category) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (TRUSTED_DOMAINS[category] || []).some((d) => host.includes(d));
  } catch {
    return false;
  }
}

function extractJsonArray(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Aucun JSON trouvé dans la réponse.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function searchGemini(category, keyword, tags) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Clé Gemini non configurée. Ajoute GEMINI_API_KEY dans les variables d'environnement Netlify (clé gratuite sur aistudio.google.com/apikey), puis redéploie.",
      }),
    };
  }

  const query = [keyword, ...tags].filter(Boolean).join(" ");
  if (!query) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "", results: [], note: "Ajoute un mot-clé pour lancer la recherche." }),
    };
  }

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const isGames = category === "jeux";

  const typeInstruction = isGames
    ? `\nPour chaque résultat, utilise tes connaissances du jeu vidéo concerné pour indiquer aussi son "type" exact parmi : "base" (le jeu complet, l'édition standard), "extension" (DLC, extension, season pass, contenu additionnel payant qui nécessite le jeu de base), ou "annexe" (bande originale, artbook, goodies, produit dérivé qui n'est pas le jeu). Ne te fie pas qu'au titre : utilise ce que tu sais réellement de ce jeu.`
    : "";

  const jsonFormat = isGames
    ? `[{"title": "nom exact du produit", "vendor": "nom du vendeur", "price": 19.99, "url": "https://lien-direct-vers-le-produit", "type": "base"}]`
    : `[{"title": "nom exact du produit", "vendor": "nom du vendeur", "price": 19.99, "url": "https://lien-direct-vers-le-produit"}]`;

  const prompt = `Cherche sur internet les offres actuelles les moins chères pour acheter "${query}" (catégorie : ${categoryLabel}) chez des vendeurs fiables livrant en France.${typeInstruction}
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans markdown, au format exact :
${jsonFormat}
Maximum 10 résultats. Le prix est un nombre décimal en euros. Ne donne jamais de prix ou d'URL inventés : base-toi uniquement sur des résultats de recherche réels. Si tu ne trouves rien, réponds avec un tableau vide [].`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini non-OK response:", res.status, JSON.stringify(data).slice(0, 500));
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error?.message || `Erreur Gemini (HTTP ${res.status}).` }),
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    let items;
    try {
      items = extractJsonArray(text);
    } catch (parseErr) {
      console.error("Gemini parse failed. Raw text:", text.slice(0, 800));
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          results: [],
          note: "Gemini a répondu mais dans un format inattendu. Réessaie, ou reformule ta recherche.",
        }),
      };
    }

    const results = items
      .filter((it) => it && it.title && it.url)
      .map((it) => {
        const price = parsePrice(it.price);
        const itemType = ["base", "extension", "annexe"].includes(it.type) ? it.type : null;
        return {
          title: String(it.title),
          link: String(it.url),
          snippet: it.vendor ? `Proposé par ${it.vendor}` : "",
          displayLink: it.vendor || (() => {
            try {
              return new URL(it.url).hostname.replace(/^www\./, "");
            } catch {
              return "Boutique";
            }
          })(),
          price,
          currency: "€",
          trustworthy: isKnownDomain(it.url, category),
          itemType,
        };
      });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, results }),
    };
  } catch (err) {
    console.error("Gemini fetch failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Impossible de contacter Gemini : ${err.message}` }),
    };
  }
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const category = params.category || "";
  const keyword = (params.keyword || "").trim();
  const tags = (params.tags || "").split(",").filter(Boolean);

  if (category === "livres" || category === "jeux" || category === "consoles") {
    return searchGemini(category, keyword, tags);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", results: [], note: "Catégorie inconnue." }),
  };
};
