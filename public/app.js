// ---------- Dark / Light mode ----------
const themeToggle = document.getElementById("theme-toggle");
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});

// ---------- Fallback Summary ----------
function generateFallbackSummary(text) {
  if (!text || text.length < 20) return "A brief update was provided, but full text unavailable.";

  text = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 25);

  if (!sentences.length) return "A brief update was provided, but full text unavailable.";

  const summary = [
    sentences[0],
    sentences[1] || sentences[0],
    sentences[2] || sentences[0],
    sentences[sentences.length - 2] || sentences[0],
    sentences[sentences.length - 1] || sentences[0],
  ];

  return summary.slice(0, 6).join(" ");
}

// ---------- Weather ----------
const weatherBtn = document.getElementById("weather-btn");
const weatherCity = document.getElementById("weather-city");
const weatherResult = document.getElementById("weather-result");

weatherBtn.addEventListener("click", async () => {
  const city = weatherCity.value.trim();
  if (!city) { weatherResult.textContent="Enter city"; return; }

  try {
    const key = "YOUR_OPENWEATHERMAP_API_KEY"; // <-- replace with your key
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${key}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    weatherResult.innerHTML = `<img src="https://openweathermap.org/img/wn/${data.weather[0].icon}.png" style="width:24px;"> ${data.name}: ${data.main.temp.toFixed(1)}°C, ${data.weather[0].description}`;
  } catch {
    weatherResult.textContent="Could not fetch weather";
  }
});

// ---------- Render Articles ----------
function renderArticles(articles) {
  const container = document.getElementById("summaries");
  container.innerHTML = "";

  if (!articles.length) {
    container.innerHTML = "<p>No articles available.</p>";
    return;
  }

  const grid = document.createElement("div");
  grid.className = "article-container";

  articles.forEach(article => {
    const card = document.createElement("div");
    card.className = "article-card";

    const shortTitle = article.title.length > 60 ? article.title.slice(0,57)+"..." : article.title;

    card.innerHTML = `
      <h3>${shortTitle}</h3>
      <p class="article-details">${article.summary || ""}</p>
      <div class="article-actions">
        <button class="summary-btn">Show Summary</button>
        <a href="${article.url}" target="_blank">Read Full Article</a>
      </div>
      <div class="summary-box"></div>
      <p class="article-source">Source: ${article.source || "Unknown"}</p>
    `;

    grid.appendChild(card);

    const btn = card.querySelector(".summary-btn");
    const box = card.querySelector(".summary-box");

    btn.addEventListener("click", () => showSummary(article, box));
    article.raw = `${article.title}. ${article.summary}`;
  });

  container.appendChild(grid);
}

// ---------- Show Summary ----------
async function showSummary(article, box) {
  box.innerHTML = `<div class="loading">Loading summary...</div>`;

  try {
    const res = await fetch(`/api/summarize?title=${encodeURIComponent(article.title)}&content=${encodeURIComponent(article.raw)}`);
    const data = await res.json();
    let summary = data.summary;

    if (!summary || summary.trim().length < 20) {
      summary = generateFallbackSummary(article.raw);
    }

    box.innerHTML = `<div class="summary-card"><p>${summary}</p></div>`;
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="summary-card"><p>${generateFallbackSummary(article.raw)}</p></div>`;
  }
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

// make global for navbar buttons
window.loadCategory = loadCategory;

// ---------- Load initial category ----------
document.addEventListener("DOMContentLoaded", () => loadCategory("news"));
