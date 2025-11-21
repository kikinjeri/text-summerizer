// ===== Escape HTML =====
function escapeHtml(str){
  if(!str) return '';
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ===== Load category =====
export async function loadCategory(category){
  const main = document.getElementById('summaries');
  main.innerHTML = `<p>Loading ${category} articles...</p>`;
  try{
    const res = await fetch(`/api/${category}`);
    if(!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if(!data.length){ main.innerHTML = `<p>No articles found for ${category}.</p>`; return; }
    main.innerHTML = '';
    const lang = document.getElementById('lang').value || 'en';

    data.forEach(article=>{
      const card = document.createElement('article');
      card.className = 'card';
      const imageHTML = article.urlToImage ? `<img src="${article.urlToImage}" alt="Article image">` : '';

      // Short description (2–3 lines)
      let shortDesc = article.summary || '';
      if(shortDesc.length > 200) shortDesc = shortDesc.slice(0,197) + '...';

      card.innerHTML = `
        ${imageHTML}
        <h2><a href="${article.url}" target="_blank">${escapeHtml(article.title)}</a></h2>
        <div class="summary-wrapper">
          <p class="summary">${escapeHtml(shortDesc)}</p>
          <div class="spinner"></div>
        </div>
        <a href="${article.url}" target="_blank" class="read-more">Read full article</a>
        <div>
          <span class="source-badge">${escapeHtml(article.source)}</span>
          <small>${new Date(article.publishedAt).toLocaleDateString()}</small>
        </div>
      `;
      main.appendChild(card);

      // AI summary + translation (5–6 sentences)
      fetch(`/api/summarize?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}&content=${encodeURIComponent(article.summary)}&lang=${lang}`)
        .then(r => r.json())
        .then(ai => {
          if(ai.summary && ai.summary.trim().length > 0){
            const p = card.querySelector('.summary');
            p.textContent = ai.summary; // Full AI summary
            const spinner = card.querySelector('.spinner'); 
            if(spinner) spinner.remove();
          }
        })
        .catch(err => { 
          console.error("AI summary failed:", err); 
          const spinner = card.querySelector('.spinner'); 
          if(spinner) spinner.remove(); 
        });
    });
  } catch(err){ console.error(err); main.innerHTML = `<p>Error loading ${category}: ${err.message}</p>`; }
}

// ===== Dark/Light Toggle =====
const toggleBtn = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme');
if(savedTheme) document.body.className = savedTheme;
function updateToggleIcon(){ toggleBtn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙'; }
updateToggleIcon();
toggleBtn.addEventListener('click', ()=>{
  document.body.classList.toggle('dark'); 
  document.body.classList.toggle('light');
  const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
  updateToggleIcon();
});

// ===== Language selector reload =====
document.getElementById('lang').addEventListener('change', ()=>{
  const currentCategory = document.querySelector('nav button.active')?.textContent.toLowerCase() || 'news';
  loadCategory(currentCategory);
});

// ===== Default category =====
window.addEventListener('DOMContentLoaded', ()=>{ loadCategory('news'); });
window.loadCategory = loadCategory;
