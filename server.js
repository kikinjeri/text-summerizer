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

app.use(express.static(path.join(__dirname,"public")));

// Caching
const cache = {};
const CACHE_DURATION = 5 * 60 * 1000;
function getCached(key){ const c = cache[key]; if(c && Date.now()-c.timestamp<CACHE_DURATION) return c.data; return null; }
function setCache(key, data){ cache[key] = { timestamp: Date.now(), data }; }

// NewsAPI categories
const validCategories = ["general","business","entertainment","health","science","sports","technology"];
const langMap = {
  en: "English",
  fr: "French",
  es: "Spanish",
  sw: "Swahili",
  ar: "Arabic",
  "zh-CN": "Mandarin Chinese",
  "zh-HK": "Cantonese Chinese"
};

// ===== Routes =====
app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.get("/api/:category", async(req,res)=>{
  const category = req.params.category;
  const cached = getCached(category);
  if(cached) return res.json(cached);

  try{
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    let apiCategory = category.toLowerCase(); 
    if(apiCategory === "news") apiCategory = "general";
    if(!validCategories.includes(apiCategory)) apiCategory = "general";
    
    const url = `https://newsapi.org/v2/top-headlines?category=${apiCategory}&pageSize=5&apiKey=${NEWS_API_KEY}&language=en`;
    const response = await fetch(url); 
    const data = await response.json();
    const summaries = (data.articles||[]).map(a=>({
      title: a.title,
      summary: a.description || a.content || "",
      url: a.url,
      source: a.source.name,
      urlToImage: a.urlToImage,
      publishedAt: a.publishedAt
    }));
    setCache(category, summaries);
    res.json(summaries);
  }catch(err){ console.error(err); res.status(500).json({ error:"Failed to fetch articles" }); }
});

// AI summarize + translate
app.get("/api/summarize", async(req,res)=>{
  const { title, content, lang } = req.query;
  const key = `${title}-${lang}`;
  const cached = getCached(key); 
  if(cached) return res.json({ summary: cached });

  try{
    const langName = langMap[lang] || "English";
    const prompt = `Summarize this article in 4-5 sentences in ${langName}:\nTitle: ${title}\nContent: ${content}`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role:"user", content: prompt }],
      temperature: 0.7
    });
    const summary = aiResponse.choices[0].message.content;
    setCache(key, summary);
    res.json({ summary });
  }catch(err){
    console.error(err);
    res.status(500).json({ summary: content });
  }
});

app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));
