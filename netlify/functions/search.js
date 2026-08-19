// Fonction serverless Netlify : fait une vraie recherche web via l'API
// Google Custom Search (gratuite jusqu'à 100 requêtes/jour) et renvoie une
// liste de résultats avec prix détecté (si trouvé) et fiabilité estimée du
// site marchand. La clé API et l'ID du moteur de recherche restent côté
// serveur (variables d'environnement Netlify), jamais exposés au navigateur.

const KNOWN_VENDORS = [
  "fnac.com",
  "cultura.com",
  "decitre.fr",
  "leslibraires.fr",
  "amazon.fr",
  "cdiscount.com",
  "micromania.fr",
  "boulanger.com",
  "darty.com",
  "rakuten.com",
  "steampowered.com",
  "instant-gaming.com",
];

const CATEGORY_HINTS = {
  livres: "livre acheter",
  jeux: "jeu vidéo acheter",
  consoles: "console acheter",
};

function extractPrice(text) {
  if (!text) return null;
  const match = text.match(/(\d{1,4}(?:[.,]\d{2})?)\s?€/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", "."));
}

function isKnownVendor(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return KNOWN_VENDORS.some((v) => host.includes(v));
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Clés API non configurées. Ajoute GOOGLE_SEARCH_API_KEY et GOOGLE_SEARCH_CX dans les variables d'environnement Netlify, puis redéploie.",
      }),
    };
  }

  const params = event.queryStringParameters || {};
  const category = params.category || "";
  const keyword = params.keyword || "";
  const tags = (params.tags || "").split(",").filter(Boolean);
  const budget = params.budget ? Number(params.budget) : null;

  const queryParts = [keyword, ...tags, CATEGORY_HINTS[category] || "", "prix"].filter(Boolean);
  const q = queryParts.join(" ");

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", q);
  url.searchParams.set("num", "10");
  url.searchParams.set("gl", "fr");
  url.searchParams.set("hl", "fr");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.error?.message || "Erreur lors de la recherche." }),
      };
    }

    const items = (data.items || []).map((item) => {
      const price = extractPrice(item.title) ?? extractPrice(item.snippet);
      return {
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        displayLink: item.displayLink,
        price,
        trustworthy: isKnownVendor(item.link),
        withinBudget: budget == null || price == null ? null : price <= budget,
      };
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, results: items }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Impossible de contacter le moteur de recherche." }),
    };
  }
};
