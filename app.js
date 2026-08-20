const categorySelect = document.getElementById("category");
const tagsContainer = document.getElementById("tags");
const form = document.getElementById("search-form");
const resultsEl = document.getElementById("results");

const AVATAR_PALETTE = ["#6d8dff", "#9d6dff", "#34d399", "#fbbf24", "#fb7185", "#22c1dc", "#f97362"];

function initCategories() {
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${cat.icon} ${cat.label}`;
    categorySelect.appendChild(opt);
  });
  renderTags(categorySelect.value);
  document.documentElement.dataset.category = categorySelect.value;
}

// Retinte l'accent du site (bouton, focus, logo...) selon la catégorie.
categorySelect.addEventListener("change", () => {
  document.documentElement.dataset.category = categorySelect.value;
});

// Fait suivre une lueur ambiante au curseur (throttle via requestAnimationFrame).
let cursorRaf = null;
document.addEventListener("pointermove", (e) => {
  if (cursorRaf) return;
  cursorRaf = requestAnimationFrame(() => {
    document.documentElement.style.setProperty("--mx", `${(e.clientX / window.innerWidth) * 100}%`);
    document.documentElement.style.setProperty("--my", `${(e.clientY / window.innerHeight) * 100}%`);
    cursorRaf = null;
  });
});

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

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function showSkeleton() {
  resultsEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-line w-60"></div>
      <div class="skeleton-line w-30"></div>
      <div class="skeleton-line w-90"></div>
    `;
    resultsEl.appendChild(card);
  }
}

function showMessage(icon, text) {
  resultsEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <p>${text}</p>
    </div>
  `;
}

const EXTRA_PATTERN = /soundtrack|\bost\b|artbook|art book|comic\b|bande originale|goodies|art\s*of\s/i;
const EXTENSION_PATTERN = /\bdlc\b|expansion|extension|add-?on|content pack|season pass|\bbundle\b|deluxe edition|ultimate edition|complete edition|goty|game of the year/i;

// Gemini classe déjà chaque résultat de jeu vidéo (r.itemType : "base",
// "extension" ou "annexe") en s'appuyant sur sa connaissance du jeu, ce
// qui est bien plus fiable qu'une détection par mots-clés dans le titre.
// Ces regex ne servent que de repli si Gemini n'a pas fourni de type.
function isExtra(r) {
  return r.itemType ? r.itemType === "annexe" : EXTRA_PATTERN.test(r.title);
}

function isExtension(r) {
  if (r.itemType) return r.itemType === "extension";
  return EXTENSION_PATTERN.test(r.title) && !EXTRA_PATTERN.test(r.title);
}

function rankByPriceAndTrust(items) {
  return [...items].sort((a, b) => {
    const aHasPrice = a.price != null;
    const bHasPrice = b.price != null;
    if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
    if (a.trustworthy !== b.trustworthy) return a.trustworthy ? -1 : 1;
    if (aHasPrice && bHasPrice) return a.price - b.price;
    return 0;
  });
}

function createCard(r, { isBest, budget, showTypeTag = false }) {
  const card = document.createElement("article");
  card.className = "product-card" + (isBest ? " best-pick" : "");
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Ouvrir ${r.title} sur ${r.displayLink}`);
  const openLink = () => window.open(r.link, "_blank", "noopener,noreferrer");
  card.addEventListener("click", openLink);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLink();
    }
  });

  const overBudget = budget != null && r.price != null && r.price > budget;
  const extension = isExtension(r);

  const avatar = document.createElement("div");
  avatar.className = "product-avatar";
  avatar.style.background = avatarColor(r.displayLink || r.title);
  avatar.textContent = (r.displayLink || "?").trim().charAt(0).toUpperCase();
  card.appendChild(avatar);

  const body = document.createElement("div");
  body.className = "product-body";

  const head = document.createElement("div");
  head.className = "product-head";
  head.innerHTML = `
    <div>
      <div class="product-title"><a href="${r.link}" target="_blank" rel="noopener noreferrer">${r.title}</a></div>
      <div class="product-tags">${r.displayLink}${showTypeTag ? (extension ? ' · <span class="type-tag">🧩 Extension / DLC</span>' : ' · <span class="type-tag base">🎮 Jeu de base</span>') : ""}</div>
    </div>
    <div>
      ${isBest ? '<span class="badge best">✓ Meilleur plan</span>' : ""}
      ${overBudget ? '<span class="badge over-budget">Dépasse le budget</span>' : ""}
    </div>
  `;
  head.querySelector(".product-title a").addEventListener("click", (e) => e.stopPropagation());
  body.appendChild(head);

  const currency = r.currency || "€";
  const verdict = document.createElement("p");
  if (r.price != null) {
    verdict.className = "verdict " + (r.trustworthy ? "trusted" : "unknown");
    verdict.innerHTML = r.trustworthy
      ? `<span class="price">${r.price.toFixed(2)} ${currency}</span><span class="verdict-note">boutique reconnue</span>`
      : `<span class="price">${r.price.toFixed(2)} ${currency}</span><span class="verdict-note">boutique peu connue, à vérifier</span>`;
  } else {
    verdict.className = "verdict";
    verdict.innerHTML = `<span class="verdict-note">ℹ️ Prix non détecté — consulte la page pour voir le tarif.</span>`;
  }
  body.appendChild(verdict);

  const snippet = document.createElement("p");
  snippet.className = "snippet";
  snippet.textContent = r.snippet || "";
  body.appendChild(snippet);

  card.appendChild(body);
  return card;
}

// Affiche un groupe de résultats homogène (même "type" de produit) avec
// son propre classement et son propre "meilleur plan". Mélanger des types
// différents (jeu de base / extension / bande originale) dans un seul
// classement par prix n'a pas de sens : une extension moins chère que le
// jeu de base ne devrait jamais lui voler le badge "Meilleur plan".
function renderSection({ items, icon, label, budget, showTypeTag, extraClass = "" }) {
  if (items.length === 0) return;
  const ranked = rankByPriceAndTrust(items);
  const bestIndex = ranked.findIndex((r) => r.price != null);

  const heading = document.createElement("p");
  heading.className = "results-summary" + (extraClass ? ` ${extraClass}` : "");
  heading.innerHTML = `<span>${icon}</span> ${label}`;
  resultsEl.appendChild(heading);

  ranked.forEach((r, i) => {
    resultsEl.appendChild(createCard(r, { isBest: i === bestIndex, budget, showTypeTag }));
  });
}

function renderResults(results, { budget, category }) {
  resultsEl.innerHTML = "";

  if (results.length === 0) {
    showMessage("🔍", "Aucun résultat. Essaie un mot-clé différent ou moins de filtres.");
    return;
  }

  const isGames = category === "jeux";
  const baseResults = isGames ? results.filter((r) => !isExtra(r) && !isExtension(r)) : results;
  const extensionResults = isGames ? results.filter((r) => isExtension(r)) : [];
  const extraResults = isGames ? results.filter((r) => isExtra(r)) : [];

  if (baseResults.length === 0) {
    showMessage("🔍", "Seules des extensions/DLC ou des bandes originales ont été trouvées pour ce mot-clé, pas le produit principal.");
  } else {
    renderSection({
      items: baseResults,
      icon: "✨",
      label: `${baseResults.length} résultat(s) trouvé(s) sur le web, triés par prix (le moins cher parmi les boutiques reconnues en premier).`,
      budget,
      showTypeTag: isGames,
    });
  }

  renderSection({
    items: extensionResults,
    icon: "🧩",
    label: "Extensions & DLC (nécessitent le jeu de base)",
    budget,
    showTypeTag: false,
    extraClass: "extras-heading",
  });

  renderSection({
    items: extraResults,
    icon: "🎵",
    label: "Bandes originales & extras (hors du jeu lui-même)",
    budget,
    showTypeTag: false,
    extraClass: "extras-heading",
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = categorySelect.value;
  const keyword = document.getElementById("keyword").value;
  const budgetRaw = document.getElementById("budget").value;
  const budget = budgetRaw === "" ? null : Number(budgetRaw);
  const tags = Array.from(tagsContainer.querySelectorAll("input:checked")).map((cb) => cb.value);

  showSkeleton();

  const params = new URLSearchParams({ category, keyword, tags: tags.join(","), budget: budget ?? "" });

  try {
    const res = await fetch(`/.netlify/functions/search?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      showMessage("❌", data.error || "Erreur pendant la recherche.");
      return;
    }

    if (data.note) {
      showMessage("ℹ️", data.note);
      return;
    }

    renderResults(data.results, { budget, category });
  } catch (err) {
    showMessage("❌", "Impossible de joindre la recherche. Vérifie ta connexion et réessaie.");
  }
});

initCategories();
