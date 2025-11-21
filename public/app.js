// ---------- Dark / Light mode ----------
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});

// ---------- Fallback Summary ----------
function generateFallbackSummary(text) {
  if (!text || text.length < 20) {
    return "A brief update was provided, but the full article text was unavailable.";
  }

  text = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.length > 25);

  if (sentences.length === 0) {
    return "A brief update was provided, but the full article text was unavailable.";
  }

  let summary = [];
  summary.push(sentences[0]);
  summary.push(sentences[1] || sentences[0]);
  summary.push(sentences[2] || sentences[0]);
  summary.push(sentences[sentences.length - 2] || sentences[0]);
  summary.push(sentences[sentences.length - 1] || sentences[0]);

  return summary.slice(0, 6).join(" ");
}

// ---------- Load Category ----------
async function loadCategory(cat) {
  const container = document.getElementById("summaries");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch(`/api/${cat}`);
    const data = await res.json();
    renderArticles(data);
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load articles.</p>";
  }
}

// Make it global so HTML buttons can call it
window.loadCategory = loadCategory;

// ---------- Render Articles ----------
function renderArticles(articles) {
  const container = document.getElementById("summaries");
  container.innerHTML = "";

  if (!articles.length) {
    container.innerHTML = "<p>No articles available.</p>";
    return;
  }

  articles.forEach(article => {
    const card = document.createElement("div");
    card.className = "article-card";

    const summaryBox = document.createElement("div");
    summaryBox.className = "summary-box";

    card.innerHTML = `
      <h3>${article.title}</h3>
      <p class="article-details">${article.summary || ""}</p>
      <button class="summary-btn">Show Summary</button>
    `;

    card.appendChild(summaryBox);
    container.appendChild(card);

    const btn = card.querySelector(".summary-btn");
    btn.addEventListener("click", () => {
      showSummary(article, summaryBox);
    });

    article.raw = `${article.title}. ${article.summary}`;
  });
}

// ---------- Show Summary ----------
async function showSummary(article, box) {
  box.innerHTML = `<div class="loading">Loading summary...</div>`;

  const lang = document.getElementById("lang").value || "fr";

  try {
    const res = await fetch(
      `/api/summarize?title=${encodeURIComponent(article.title)}&content=${encodeURIComponent(article.raw)}&lang=${lang}`
    );

    const data = await res.json();
    let summary = data.summary;

    if (!summary || summary.trim().length < 20) {
      summary = generateFallbackSummary(article.raw);
    }

    box.innerHTML = `
      <div class="summary-card">
        <p>${summary}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);
    const summary = generateFallbackSummary(article.raw);

    box.innerHTML = `
      <div class="summary-card">
        <p>${summary}</p>
      </div>
    `;
  }
}
