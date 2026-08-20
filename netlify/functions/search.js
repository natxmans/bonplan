// Fonction serverless Netlify : vraie recherche de prix.
// - Jeux vidéo : API gratuite CheapShark (aucune clé, aucun compte).
// - Livres / Consoles : API Gemini avec l'outil "Google Search" (grounding),
//   qui cherche réellement sur le web puis renvoie une liste structurée.
//   Gratuite via Google AI Studio, sans carte bancaire (contrairement à
//   Google Custom Search) — voir README pour la configuration.

const STORE_NAMES = {
  1: "Steam",
  7: "GOG",
  8: "Origin (EA)",
  11: "Humble Store",
  13: "Uplay (Ubisoft)",
  15: "Fanatical",
  23: "GameBillet",
  25: "Epic Games Store",
  27: "Gamesplanet",
  30: "IndieGala",
  31: "Blizzard Shop",
  33: "DLGamer",
};

// Boutiques considérées fiables par défaut (éditeurs officiels ou
// revendeurs autorisés bien établis). Les autres sont marquées "à vérifier".
const TRUSTED_STORE_IDS = new Set([1, 7, 8, 11, 13, 15, 25, 27, 31]);

const TRUSTED_DOMAINS = {
  livres: ["fnac.com", "cultura.com", "decitre.fr", "leslibraires.fr", "amazon.fr", "momox-shop.fr", "rakuten.com"],
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
  consoles: "console de jeux vidéo",
};

function isKnownDomain(url, category) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (TRUSTED_DOMAINS[category] || []).some((d) => host.includes(d));
  } catch {
    return false;
  }
}

async function searchCheapShark(keyword, tags, budget) {
  const title = keyword || tags[0] || "";
  if (!title) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        results: [],
        note: "Ajoute un mot-clé (le nom du jeu, ex : Zelda) pour lancer la recherche.",
      }),
    };
  }

  const url = new URL("https://www.cheapshark.com/api/1.0/deals");
  url.searchParams.set("title", title);
  url.searchParams.set("sortBy", "Price");
  url.searchParams.set("pageSize", "20");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "BonPlanApp/1.0 (+https://bonplan-carine-nathan-2026x9.netlify.app)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.error("CheapShark non-OK response:", res.status, bodyText.slice(0, 300));
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: `Erreur CheapShark (HTTP ${res.status}).` }),
      };
    }
    const deals = await res.json();

    const results = deals.map((d) => {
      const price = parseFloat(d.salePrice);
      const storeId = Number(d.storeID);
      return {
        title: d.title,
        link: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
        snippet: `Prix normal ${parseFloat(d.normalPrice).toFixed(2)} $ — économie ${Math.round(
          parseFloat(d.savings) || 0
        )}%`,
        displayLink: STORE_NAMES[storeId] || `Boutique #${storeId}`,
        price,
        currency: "$",
        trustworthy: TRUSTED_STORE_IDS.has(storeId),
        withinBudget: budget == null ? null : price <= budget,
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: title, results }),
    };
  } catch (err) {
    console.error("CheapShark fetch failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Impossible de contacter CheapShark : ${err.message}` }),
    };
  }
}

function extractJsonArray(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Aucun JSON trouvé dans la réponse.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function searchGemini(category, keyword, tags, budget) {
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
  const prompt = `Cherche sur internet les offres actuelles les moins chères pour acheter "${query}" (catégorie : ${categoryLabel}) chez des vendeurs fiables livrant en France.
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans markdown, au format exact :
[{"title": "nom exact du produit", "vendor": "nom du vendeur", "price": 19.99, "url": "https://lien-direct-vers-le-produit"}]
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
        const price = it.price != null ? Number(it.price) : null;
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
          price: Number.isFinite(price) ? price : null,
          currency: "€",
          trustworthy: isKnownDomain(it.url, category),
          withinBudget: budget == null || price == null ? null : price <= budget,
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
  const budget = params.budget ? Number(params.budget) : null;

  if (category === "jeux") {
    return searchCheapShark(keyword, tags, budget);
  }
  if (category === "livres" || category === "consoles") {
    return searchGemini(category, keyword, tags, budget);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "", results: [], note: "Catégorie inconnue." }),
  };
};
