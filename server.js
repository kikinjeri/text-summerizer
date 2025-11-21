import express from "express";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import OpenAI from "openai";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// ---------- Cache ----------
const cache = {};
const TTL = 5 * 60 * 1000;
function getCache(k) {
  const item = cache[k];
  if (item && Date.now() - item.time < TTL) return item.data;
  return null;
}
function setCache(k, data) {
  cache[k] = { time: Date.now(), data };
}

// ---------- News API ----------
app.get("/api/:category", async (req, res) => {
  const category = req.params.category.toLowerCase();
  const key = "news-" + category;

  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    let mapped = category;
    if (mapped === "news") mapped = "general";

    const url = `https://newsapi.org/v2/top-headlines?category=${mapped}&pageSize=6&language=en&apiKey=${NEWS_API_KEY}`;

    const r = await fetch(url);
    const d = await r.json();

    const formatted = (d.articles || []).map(a => ({
      title: a.title,
      summary: a.description || a.content || "",
      raw: (a.title || "") + ". " + (a.description || a.content || ""),
      url: a.url,
      source: a.source?.name,
      publishedAt: a.publishedAt
    }));

    setCache(key, formatted);
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// ---------- AI Summary ----------
app.get("/api/summarize", async (req, res) => {
  const { title, content, lang } = req.query;
  const key = `${title}-${lang}`;

  const cached = getCache(key);
  if (cached) return res.json({ summary: cached });

  try {
    const prompt = `
Summarize the following news article in 5-6 sentences in ${lang === "fr" ? "French" : "English"}.
Article:
${content}
    `;

    const ai = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    const summary = ai.choices[0].message.content;
    setCache(key, summary);

    res.json({ summary });
  } catch (err) {
    console.error("AI FAILED:", err);
    res.json({ summary: "" });
  }
});

app.listen(PORT, () =>
  console.log("Server running at http://localhost:" + PORT)
);
