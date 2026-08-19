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

function renderResults(results, { budget }) {
  resultsEl.innerHTML = "";

  if (results.length === 0) {
    showMessage("🔍", "Aucun résultat. Essaie un mot-clé différent ou moins de filtres.");
    return;
  }

  const ranked = [...results].sort((a, b) => {
    const aHasPrice = a.price != null;
    const bHasPrice = b.price != null;
    if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
    if (a.trustworthy !== b.trustworthy) return a.trustworthy ? -1 : 1;
    if (aHasPrice && bHasPrice) return a.price - b.price;
    return 0;
  });

  const bestIndex = ranked.findIndex((r) => r.price != null);

  const summary = document.createElement("p");
  summary.className = "results-summary";
  summary.innerHTML = `<span>✨</span> ${ranked.length} résultat(s) trouvé(s) sur le web, triés par prix (le moins cher parmi les boutiques reconnues en premier).`;
  resultsEl.appendChild(summary);

  ranked.forEach((r, i) => {
    const card = document.createElement("article");
    card.className = "product-card" + (i === bestIndex ? " best-pick" : "");
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
        <div class="product-tags">${r.displayLink}</div>
      </div>
      <div>
        ${i === bestIndex ? '<span class="badge best">✓ Meilleur plan</span>' : ""}
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
    resultsEl.appendChild(card);
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

    renderResults(data.results, { budget });
  } catch (err) {
    showMessage("❌", "Impossible de joindre la recherche. Vérifie ta connexion et réessaie.");
  }
});

initCategories();
