const categorySelect = document.getElementById("category");
const tagsContainer = document.getElementById("tags");
const form = document.getElementById("search-form");
const resultsEl = document.getElementById("results");

// Seuils utilisés pour juger automatiquement si un vendeur est "fiable".
// L'utilisateur n'a rien à choisir : c'est le site qui tranche et l'explique.
const TRUST_MIN_RATING = 3.8;
const TRUST_MIN_REVIEWS = 30;

function initCategories() {
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${cat.icon} ${cat.label}`;
    categorySelect.appendChild(opt);
  });
  renderTags(categorySelect.value);
}

function renderTags(categoryKey) {
  tagsContainer.innerHTML = "";
  const cat = CATEGORIES[categoryKey];
  if (!cat) return;
  cat.tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "tag-option";
    label.innerHTML = `<input type="checkbox" value="${tag}" /> ${tag}`;
    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => {
      label.classList.toggle("checked", checkbox.checked);
    });
    tagsContainer.appendChild(label);
  });
}

categorySelect.addEventListener("change", () => renderTags(categorySelect.value));

function starString(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function isTrustworthy(offer) {
  return offer.rating >= TRUST_MIN_RATING && offer.reviews >= TRUST_MIN_REVIEWS;
}

// Le site décide seul : parmi les vendeurs jugés fiables, on prend le moins
// cher. S'il n'y en a aucun, on prend le moins cher quand même mais on
// prévient clairement que la fiabilité n'est pas garantie.
function rankOffers(offers) {
  const flagged = offers.map((o) => ({ ...o, trustworthy: isTrustworthy(o) }));
  const sorted = [...flagged].sort((a, b) => {
    if (a.trustworthy !== b.trustworthy) return a.trustworthy ? -1 : 1;
    return a.price - b.price;
  });
  const hasTrustworthy = sorted.some((o) => o.trustworthy);
  return { sorted, hasTrustworthy };
}

function matchesFilters(product, { category, keyword, tags }) {
  if (product.category !== category) return false;
  if (keyword) {
    const k = keyword.trim().toLowerCase();
    const inTitle = product.title.toLowerCase().includes(k);
    const inTags = product.tags.some((t) => t.toLowerCase().includes(k));
    if (!inTitle && !inTags) return false;
  }
  if (tags.length > 0) {
    const hasTag = tags.some((t) => product.tags.includes(t));
    if (!hasTag) return false;
  }
  return true;
}

function renderResults(products, { budget }) {
  resultsEl.innerHTML = "";

  if (products.length === 0) {
    resultsEl.innerHTML = `<p class="hint">Aucun résultat pour ces critères. Essaie d'élargir ta recherche (moins de tags, ou pas de mot-clé).</p>`;
    return;
  }

  const enriched = products
    .map((product) => {
      const { sorted, hasTrustworthy } = rankOffers(product.offers);
      const best = sorted[0];
      const withinBudget = budget == null || best.price <= budget;
      return { product, sorted, best, hasTrustworthy, withinBudget };
    })
    .sort((a, b) => {
      if (a.withinBudget !== b.withinBudget) return a.withinBudget ? -1 : 1;
      return a.best.price - b.best.price;
    });

  const summary = document.createElement("p");
  summary.className = "results-summary";
  summary.textContent = `${enriched.length} résultat(s) trouvé(s) dans la base simulée. Pour chaque article, on choisit automatiquement le moins cher parmi les vendeurs fiables.`;
  resultsEl.appendChild(summary);

  enriched.forEach(({ product, sorted, best, hasTrustworthy, withinBudget }, index) => {
    const card = document.createElement("article");
    card.className = "product-card" + (index === 0 && withinBudget ? " best-pick" : "");

    const head = document.createElement("div");
    head.className = "product-head";
    head.innerHTML = `
      <div>
        <div class="product-title">${product.title}</div>
        <div class="product-tags">${product.tags.join(" · ")}</div>
      </div>
      <div>
        ${index === 0 && withinBudget ? '<span class="badge best">Meilleur plan</span>' : ""}
        ${!withinBudget ? '<span class="badge over-budget">Dépasse le budget</span>' : ""}
      </div>
    `;
    card.appendChild(head);

    const verdict = document.createElement("p");
    verdict.className = "verdict";
    verdict.textContent = hasTrustworthy
      ? `✅ Choix auto : ${best.vendor} à ${best.price.toFixed(2)} € — le moins cher parmi les vendeurs fiables (note ≥ ${TRUST_MIN_RATING}/5, ≥ ${TRUST_MIN_REVIEWS} avis).`
      : `⚠️ Aucun vendeur vraiment fiable pour cet article. ${best.vendor} à ${best.price.toFixed(2)} € est le moins cher, mais vérifie les avis avant d'acheter.`;
    card.appendChild(verdict);

    const offersEl = document.createElement("div");
    offersEl.className = "offers";
    sorted.forEach((offer, i) => {
      const row = document.createElement("div");
      row.className = "offer-row" + (i === 0 ? " top-offer" : "");
      row.innerHTML = `
        <div class="offer-vendor">${offer.vendor}<span class="vendor-type">${offer.type === "officiel" ? "Vendeur officiel" : "Marketplace tierce"}</span></div>
        <div class="offer-price">${offer.price.toFixed(2)} €</div>
        <div>
          <span class="stars">${starString(offer.rating)}</span>
          <div class="reviews">${offer.rating.toFixed(1)}/5 · ${offer.reviews} avis</div>
        </div>
        <div>${offer.trustworthy ? '<span class="trust-ok">✓ Fiable</span>' : '<span class="trust-low">⚠ Fiabilité incertaine</span>'}</div>
      `;
      offersEl.appendChild(row);
    });
    card.appendChild(offersEl);
    resultsEl.appendChild(card);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const category = categorySelect.value;
  const keyword = document.getElementById("keyword").value;
  const budgetRaw = document.getElementById("budget").value;
  const budget = budgetRaw === "" ? null : Number(budgetRaw);
  const tags = Array.from(tagsContainer.querySelectorAll("input:checked")).map((cb) => cb.value);

  const filtered = PRODUCTS.filter((p) => matchesFilters(p, { category, keyword, tags }));

  resultsEl.innerHTML = `<p class="hint">Recherche en cours (simulation)...</p>`;
  setTimeout(() => renderResults(filtered, { budget }), 400);
});

initCategories();
