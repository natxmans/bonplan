// Fonction serverless Netlify : vraie recherche de prix pour les jeux vidéo
// via l'API gratuite CheapShark (aucune clé, aucun compte, aucune carte
// bancaire nécessaire). Compare les prix réels sur Steam, GOG, Epic, etc.
//
// Livres et consoles n'ont pas d'équivalent gratuit sans carte bancaire
// pour l'instant (Google Custom Search en aurait un, mais Google exige un
// compte de facturation même sous le quota gratuit) — voir README.

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

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const category = params.category || "";
  const keyword = (params.keyword || "").trim();
  const tags = (params.tags || "").split(",").filter(Boolean);
  const budget = params.budget ? Number(params.budget) : null;

  if (category !== "jeux") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        results: [],
        note:
          "La vraie recherche n'est disponible que pour les Jeux vidéo pour l'instant (API gratuite sans carte bancaire : CheapShark). Livres et consoles n'ont pas encore d'équivalent gratuit sans carte.",
      }),
    };
  }

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
};
