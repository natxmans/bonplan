const categorySelect = document.getElementById("category");
const tagsContainer = document.getElementById("tags");
const form = document.getElementById("search-form");
const resultsEl = document.getElementById("results");

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

function renderResults(results, { budget }) {
  resultsEl.innerHTML = "";

  if (results.length === 0) {
    resultsEl.innerHTML = `<p class="hint">Aucun résultat. Essaie un mot-clé différent ou moins de filtres.</p>`;
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
  summary.textContent = `${ranked.length} résultat(s) trouvé(s) sur le web. Triés par prix détecté (le moins cher parmi les sites reconnus en premier).`;
  resultsEl.appendChild(summary);

  ranked.forEach((r, i) => {
    const card = document.createElement("article");
    card.className = "product-card" + (i === bestIndex ? " best-pick" : "");

    const overBudget = budget != null && r.price != null && r.price > budget;

    const head = document.createElement("div");
    head.className = "product-head";
    head.innerHTML = `
      <div>
        <div class="product-title"><a href="${r.link}" target="_blank" rel="noopener noreferrer">${r.title}</a></div>
        <div class="product-tags">${r.displayLink}</div>
      </div>
      <div>
        ${i === bestIndex ? '<span class="badge best">Meilleur plan détecté</span>' : ""}
        ${overBudget ? '<span class="badge over-budget">Dépasse le budget</span>' : ""}
      </div>
    `;
    card.appendChild(head);

    const verdict = document.createElement("p");
    verdict.className = "verdict";
    if (r.price != null) {
      verdict.textContent = r.trustworthy
        ? `✅ ${r.price.toFixed(2)} € — site marchand reconnu.`
        : `⚠️ ${r.price.toFixed(2)} € détecté, mais site peu connu : vérifie sa fiabilité avant d'acheter.`;
    } else {
      verdict.textContent = "ℹ️ Prix non détecté automatiquement — consulte la page pour voir le tarif.";
    }
    card.appendChild(verdict);

    const snippet = document.createElement("p");
    snippet.className = "snippet";
    snippet.textContent = r.snippet || "";
    card.appendChild(snippet);

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

  resultsEl.innerHTML = `<p class="hint">Recherche en cours sur internet...</p>`;

  const params = new URLSearchParams({ category, keyword, tags: tags.join(","), budget: budget ?? "" });

  try {
    const res = await fetch(`/.netlify/functions/search?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      resultsEl.innerHTML = `<p class="hint">❌ ${data.error || "Erreur pendant la recherche."}</p>`;
      return;
    }

    renderResults(data.results, { budget });
  } catch (err) {
    resultsEl.innerHTML = `<p class="hint">❌ Impossible de joindre la recherche. Vérifie ta connexion et réessaie.</p>`;
  }
});

initCategories();
