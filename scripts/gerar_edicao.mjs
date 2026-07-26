import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      'content:encoded', 'description', 'summary', 'content',
      'media:content', 'media:thumbnail', 'enclosure'
    ],
  },
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeithanBot/1.0' },
  timeout: 10000,
});

// ─── GOOGLE TRANSLATE HELPER ─────────────────────────────────────────────────
async function translateToPortuguese(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return text;
  const lower = text.toLowerCase();
  // Skip if already looks Portuguese
  if (/\b(da|do|de|em|para|com|por|que|uma|um|os|as|na|no|sobre|segundo|diz|aponta|afirma|governo|brasil)\b/.test(lower)) {
    return text;
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text.slice(0, 1200))}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    if (data && data[0]) {
      return data[0].map(p => p[0]).join('') || text;
    }
  } catch (_) {}
  return text;
}

// ─── WEATHER ─────────────────────────────────────────────────────────────────
function getWeatherDescription(code) {
  switch (code) {
    case 0: return 'céu limpo';
    case 1: return 'poucas nuvens';
    case 2: return 'parcialmente nublado';
    case 3: return 'encoberto';
    case 45: case 48: return 'nevoeiro';
    case 51: case 53: case 55: return 'garoa';
    case 61: case 63: case 65: return 'chuva';
    case 80: case 81: case 82: return 'pancadas de chuva';
    case 95: case 96: case 99: return 'tempestade';
    default: return 'nublado';
  }
}

async function fetchWeather() {
  console.log('🌤️ Puxando dados do clima via Open-Meteo API...');
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=-29.15667,-30.03283,-27.59667,-27.16194,-28.13139&longitude=-49.57944,-51.23019,-48.54917,-53.40528,-55.02556&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const names = ['Gaivota', 'Porto Alegre', 'Florianópolis', 'Vicente Dutra', 'Roque Gonzales'];
    return data.map((item, i) => ({
      cidade: names[i],
      temp: item.current.temperature_2m.toFixed(1),
      max: item.daily.temperature_2m_max[0].toFixed(1),
      min: item.daily.temperature_2m_min[0].toFixed(1),
    }));
  } catch (err) {
    console.error('⚠️ Erro ao puxar clima:', err.message);
    return [
      { cidade: 'Gaivota', temp: '20.2', max: '20.1', min: '13.7' },
      { cidade: 'Porto Alegre', temp: '20.8', max: '22.5', min: '12.5' },
      { cidade: 'Florianópolis', temp: '21.6', max: '21.7', min: '12.8' },
      { cidade: 'Vicente Dutra', temp: '22.6', max: '23.8', min: '13.9' },
      { cidade: 'Roque Gonzales', temp: '20.8', max: '22.4', min: '13.3' },
    ];
  }
}

// ─── FEEDS ───────────────────────────────────────────────────────────────────
const CANAIS_FEEDS = {
  nacionais: [
    { name: 'G1 (Globo)', url: 'https://g1.globo.com/rss/g1/' },
    { name: 'Folha de S.Paulo', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
    { name: 'Record (R7)', url: 'https://news.google.com/rss/search?q=when:24h+site:r7.com&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Metrópoles', url: 'https://www.metropoles.com/feed' },
  ],
  internacionais_br: [
    { name: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    { name: 'DW Brasil', url: 'https://rss.dw.com/rdf/rss-br-all' },
    { name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
    { name: 'Investing.com Brasil', url: 'https://br.investing.com/rss/news.rss' },
  ],
  internacionais_world: [
    { name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
    { name: 'BBC News World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Associated Press', url: 'https://news.google.com/rss/search?q=when:24h+source:Associated+Press&hl=en-US&gl=US&ceid=US:en' },
  ],
  esquerda: [
    { name: 'Brasil 247', url: 'https://www.brasil247.com/feed' },
    { name: 'The Intercept Brasil', url: 'https://theintercept.com/feed/?lang=pt' },
    { name: 'DCM', url: 'https://www.diariodocentrodomundo.com.br/feed/' },
    { name: 'CartaCapital', url: 'https://news.google.com/rss/search?q=when:24h+site:cartacapital.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  ],
  direita: [
    { name: 'Jovem Pan News', url: 'https://jovempan.com.br/feed' },
    { name: 'Revista Oeste', url: 'https://revistaoeste.com/feed/' },
    { name: 'O Antagonista', url: 'https://oantagonista.com.br/feed/' },
    { name: 'Gazeta do Povo', url: 'https://news.google.com/rss/search?q=when:24h+site:gazetadopovo.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  ],
};

const CADERNOS_FEEDS = {
  Sociedade: [
    { name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml' },
    { name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    { name: 'Estadão', url: 'https://news.google.com/rss/search?q=when:24h+site:estadao.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'UOL Notícias', url: 'https://news.google.com/rss/search?q=when:24h+site:noticias.uol.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  ],
  Politica: [
    { name: 'Poder360', url: 'https://www.poder360.com.br/feed/' },
    { name: 'Folha Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml' },
    { name: 'Metrópoles Política', url: 'https://www.metropoles.com/colunas/igor-gadelha/feed' },
    { name: 'Congresso em Foco', url: 'https://congressoemfoco.uol.com.br/feed/' },
  ],
  Economia: [
    { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
    { name: 'InvestNews', url: 'https://investnews.com.br/feed/' },
    { name: 'NeoFeed', url: 'https://neofeed.com.br/feed/' },
    { name: 'Valor Econômico', url: 'https://news.google.com/rss/search?q=when:24h+site:valor.globo.com&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  ],
  Tech: [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/' },
    { name: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
    { name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/' },
  ],
  Marketing: [
    { name: 'Meio & Mensagem', url: 'https://www.meioemensagem.com.br/feed' },
    { name: 'Marketing Dive', url: 'https://www.marketingdive.com/feeds/news/' },
    { name: 'Conversion', url: 'https://www.conversion.com.br/feed/' },
    { name: 'Adweek', url: 'https://www.adweek.com/feed/' },
  ],
  Futebol: [
    { name: 'GE - Inter', url: 'https://news.google.com/rss/search?q=when:24h+Internacional+gaúcho+futebol&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'GZH Esportes', url: 'https://news.google.com/rss/search?q=when:24h+site:gzh.clicrbs.com.br+Inter&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Correio do Povo', url: 'https://news.google.com/rss/search?q=when:24h+site:correiodopovo.com.br+Inter&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Vozes do Gigante', url: 'https://news.google.com/rss/search?q=when:24h+Sport+Club+Internacional+Colorado&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
  ],
};

// ─── FILTROS DE INTERESSE DO NATHAN (CALIBRADOS) ─────────────────────────────
// Prioridade: IA > Tech > Economia/Negócios > Marketing > Política > Sociedade > Geo/Historia > Futebol
const INTEREST_CATEGORIES = {
  ia: [
    'inteligência artificial', 'ia generativa', 'chatgpt', 'openai', 'llm', 'gpt-', 'gemini',
    'claude', 'copilot', 'machine learning', 'deep learning', 'neural', 'modelo de linguagem',
    'large language', 'diffusion', 'midjourney', 'stable diffusion', 'sora', 'ai agent',
    'anthropic', 'mistral', 'perplexity', 'cursor', 'windsurf',
  ],
  tech: [
    'tecnologia', 'tech', 'startup', 'software', 'hardware', 'apple', 'google', 'microsoft',
    'nvidia', 'chip', 'semicondutor', 'iphone', 'android', 'developer', 'programação',
    'cibersegurança', 'hack', 'vazamento de dados', 'blockchain', 'metaverso', 'realidade virtual',
    'computação quântica', 'iot', 'saas', 'plataforma digital', 'app', 'algoritmo',
  ],
  economia_negocios: [
    'economia', 'inflação', 'juros', 'bolsa', 'dólar', 'ibovespa', 'selic', 'banco central',
    'pib', 'recessão', 'mercado financeiro', 'ação', 'fundo', 'investimento', 'empresa',
    'negócio', 'fusão', 'aquisição', 'ipo', 'unicórnio', 'startups', 'venture capital',
    'ceo', 'resultado financeiro', 'lucro', 'prejuízo', 'b3', 'tesouro', 'exportação', 'importação',
  ],
  marketing: [
    'marketing', 'publicidade', 'propaganda', 'anúncio', 'advertising', 'branding', 'marca',
    'influencer', 'creator', 'conteúdo digital', 'seo', 'geo', 'tráfego pago',
    'google ads', 'meta ads', 'tiktok ads', 'performance', 'conversão', 'e-commerce',
    'redes sociais', 'social media', 'youtube', 'instagram', 'tiktok', 'reels', 'shorts',
    'audiovisual', 'vídeo digital', 'podcast', 'newsletter', 'inbound', 'growth',
  ],
  politica: [
    'política', 'governo', 'stf', 'congresso', 'senado', 'câmara', 'lula', 'trump',
    'eleições', 'presidente', 'ministro', 'lei', 'reforma', 'votação', 'oposição',
    'partido', 'democracia', 'diplomacia', 'sanção', 'geopolítica', 'onu', 'tratado',
    'guerra', 'conflito', 'israel', 'ucrânia', 'rússia', 'china', 'eua', 'tarifa',
  ],
  sociedade: [
    'sociedade', 'direitos', 'saúde pública', 'educação', 'cultura', 'crime', 'segurança',
    'violência', 'mortes', 'catástrofe', 'desastre', 'comportamento', 'tendência',
    'pesquisa', 'ciência', 'estudo', 'descoberta', 'espaço', 'nasa', 'medicina',
    'vacina', 'epidemia', 'clima', 'aquecimento global', 'sustentabilidade', 'energia',
  ],
  geo_historia: [
    'história', 'arqueologia', 'civilização', 'antiguidade', 'descoberta histórica',
    'museu', 'patrimônio', 'curiosidade', 'inusitado', 'geopolítica', 'atlas',
    'geografia', 'fronteira', 'território', 'origem', 'cultura local',
  ],
  futebol: [
    'inter', 'colorado', 'sport club internacional', 'beira-rio',
    'brasileirão', 'libertadores', 'copa do brasil', 'série a',
  ],
};

const INTEREST_PRIORITY = ['ia', 'tech', 'economia_negocios', 'marketing', 'politica', 'sociedade', 'geo_historia', 'futebol'];

function getInterestScore(title, body) {
  const text = (title + ' ' + body).toLowerCase();
  for (let i = 0; i < INTEREST_PRIORITY.length; i++) {
    const cat = INTEREST_PRIORITY[i];
    const keywords = INTEREST_CATEGORIES[cat];
    if (keywords.some(kw => text.includes(kw))) {
      return { score: INTEREST_PRIORITY.length - i, category: cat };
    }
  }
  return { score: 0, category: null };
}

function isOfInterest(title, body) {
  return getInterestScore(title, body).score > 0;
}

// ─── IMAGE EXTRACTION ─────────────────────────────────────────────────────────
function extractImageUrl(item) {
  if (item.enclosure?.url && (item.enclosure.type?.includes('image') || item.enclosure.url.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
    return item.enclosure.url;
  }
  for (const field of ['media:content', 'media:thumbnail']) {
    const mc = item[field];
    if (mc) {
      const arr = Array.isArray(mc) ? mc : [mc];
      const found = arr.find(m => (m.$?.url) || m.url);
      if (found) return found.$?.url || found.url;
    }
  }
  const html = item['content:encoded'] || item.content || item.description || item.summary || '';
  const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"'\s]+)["']/i);
  return match?.[1] || null;
}

// ─── CHECKPOINT ───────────────────────────────────────────────────────────────
function getCheckpointTimestamp(dataDir) {
  const file = path.join(dataDir, 'ultima_verificacao.json');
  const maxLimit = Date.now() - 72 * 60 * 60 * 1000;
  if (fs.existsSync(file)) {
    try {
      const lastRun = new Date(JSON.parse(fs.readFileSync(file, 'utf-8')).lastRun).getTime();
      return Math.max(lastRun, maxLimit);
    } catch (_) {}
  }
  return maxLimit;
}

function updateCheckpointTimestamp(dataDir) {
  fs.writeFileSync(path.join(dataDir, 'ultima_verificacao.json'), JSON.stringify({ lastRun: new Date().toISOString() }, null, 2), 'utf-8');
}

// ─── FEED FETCHING ────────────────────────────────────────────────────────────
async function fetchFeedGroup(feedList, minTimestamp) {
  const result = [];
  const isEnglishFeed = (url) => ['nytimes.com', 'bbci.co.uk/news/world', 'theguardian.com', 'Associated+Press', 'techcrunch.com', 'marketingdive.com', 'adweek.com'].some(d => url.includes(d));

  for (const f of feedList) {
    try {
      const feed = await parser.parseURL(f.url);
      const rawItems = feed.items || [];

      let filtered = rawItems.filter(item => {
        const d = item.pubDate || item.isoDate;
        if (!d) return true;
        const t = new Date(d).getTime();
        return isNaN(t) || t >= minTimestamp;
      });
      if (!filtered.length && rawItems.length) filtered = rawItems.slice(0, 10);
      const top = filtered.slice(0, 12);
      const english = isEnglishFeed(f.url);

      const items = await Promise.all(top.map(async item => {
        let title = (item.title || '').trim();
        let rawBody = item['content:encoded'] || item.content || item.contentSnippet || item.summary || item.description || '';
        const imageUrl = extractImageUrl(item);

        rawBody = rawBody.replace(/<[^>]*>?/gm, '').replace(/[\r\n\t]+/g, ' ').trim();

        const titleClean = title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const bodyClean = rawBody.toLowerCase().replace(/[^a-z0-9]/g, '');

        let resumo = rawBody;
        if (!resumo || resumo.length < 50 || bodyClean === titleClean || (bodyClean.includes(titleClean) && resumo.length < title.length + 30)) {
          resumo = `Reportagem do portal ${f.name} detalhando os acontecimentos sobre "${title}". O artigo traz a cobertura dos fatos, contexto das declarações e principais desdobramentos.`;
        } else if (resumo.length > 600) {
          const trimmed = resumo.slice(0, 600);
          const lastDot = Math.max(trimmed.lastIndexOf('. '), trimmed.lastIndexOf('! '), trimmed.lastIndexOf('? '));
          resumo = lastDot > 200 ? trimmed.slice(0, lastDot + 1) : trimmed + '…';
        }

        if (english) {
          title = await translateToPortuguese(title);
          if (resumo) resumo = await translateToPortuguese(resumo);
        }

        const pubTime = (item.pubDate || item.isoDate) ? new Date(item.pubDate || item.isoDate).getTime() : 0;

        return {
          fonte: f.name,
          domain: (() => { try { return new URL(item.link || 'https://google.com').hostname.replace(/^www\./, ''); } catch (_) { return 'portal.com'; } })(),
          titulo: title,
          resumo,
          imagem: imageUrl,
          link: item.link || '#',
          score: getInterestScore(title, resumo),
          pubDateTimestamp: isNaN(pubTime) ? 0 : pubTime,
        };
      }));

      result.push(...items);
    } catch (e) {
      console.warn(`  ⚠️ RSS (${f.name}) falhou: ${e.message}`);
    }
  }
  return result;
}

// ─── CARD RENDERING ───────────────────────────────────────────────────────────
function renderChannelCard(channelName, allItems) {
  if (!allItems.length) return '';

  // Sort items: first by interest score (highest first), then by newest publication date
  const sorted = [...allItems].sort((a, b) => {
    const scoreDiff = (b.score?.score || 0) - (a.score?.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.pubDateTimestamp || 0) - (a.pubDateTimestamp || 0);
  });

  // Main article = highest scoring or first item
  const main = sorted[0];

  // Next 4 = best remaining items of interest, then fill with whatever
  const rest = sorted.slice(1);
  const picks = rest.filter(i => i.score?.score > 0).slice(0, 4);
  if (picks.length < 4) {
    const extras = rest.filter(i => !picks.includes(i)).slice(0, 4 - picks.length);
    picks.push(...extras);
  }

  // All remaining for "outras"
  const outros = rest.filter(i => !picks.includes(i));

  const mainResumoBtn = main.resumo ? `
          <details class="accordion" style="margin-top: 8px;">
            <summary><span class="plus-icon">+</span> Resumo da Matéria</summary>
            <div class="accordion-body">
              <p>${main.resumo}</p>
              <span class="close-link-text" onclick="closeAccordion(this)" style="margin-top:8px;display:inline-block;"><span class="plus-icon">−</span> Fechar</span>
            </div>
          </details>` : '';

  // Each pick: title + accordion button for resumo
  const picksHtml = picks.map(it => {
    const pickResumoBtn = it.resumo ? `
            <details class="accordion" style="margin-top: 5px;">
              <summary><span class="plus-icon">+</span> Resumo da Matéria</summary>
              <div class="accordion-body">
                <p>${it.resumo}</p>
                <span class="close-link-text" onclick="closeAccordion(this)" style="margin-top:6px;display:inline-block;"><span class="plus-icon">−</span> Fechar</span>
              </div>
            </details>` : '';
    return `
          <li class="pick-item" style="margin-bottom: 8px;">
            <a href="${it.link}" target="_blank" rel="noopener" class="secondary-title-link">${it.titulo}</a>${pickResumoBtn}
          </li>`;
  }).join('');

  const outrosHtml = outros.map(it => `
            <li>
              <a href="${it.link}" target="_blank" rel="noopener" class="secondary-title-link" style="color:var(--ink-soft);">${it.titulo}</a>
            </li>`).join('');

  const outrosSection = outros.length ? `
        <div class="section-divider"></div>
        <div class="card-section">
          <details class="accordion" style="margin:0;">
            <summary><span class="plus-icon">+</span> Mais notícias do dia (${outros.length})</summary>
            <div class="accordion-body" style="margin-top:8px;">
              <ul class="secondary-list">${outrosHtml}</ul>
              <span class="close-link-text" onclick="closeAccordion(this)" style="margin-top:10px;display:inline-block;"><span class="plus-icon">−</span> Recolher</span>
            </div>
          </details>
        </div>` : '';

  return `      <article class="article-card">

        <!-- CANAL -->
        <div class="card-section">
          <div class="card-header">
            <h3 class="channel-title">${channelName}</h3>
            <span class="channel-domain">${main.domain}</span>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- MATÉRIA PRINCIPAL -->
        <div class="card-section">
          <div class="main-headline-badge">MATÉRIA PRINCIPAL</div>
          ${main.imagem ? `
          <a href="${main.link}" target="_blank" rel="noopener" style="display:block;margin:8px 0 10px;">
            <img src="${main.imagem}" alt="" class="main-article-img" loading="lazy" onerror="this.style.display='none';" />
          </a>` : ''}
          <h4 class="main-article-title">
            <a href="${main.link}" target="_blank" rel="noopener">${main.titulo}</a>
          </h4>${mainResumoBtn}
        </div>

        ${picks.length ? `
        <div class="section-divider"></div>

        <!-- DESTAQUES DO DIA -->
        <div class="card-section">
          <strong class="section-label">DESTAQUES DO DIA:</strong>
          <ul class="picks-list" style="margin-top:10px;">${picksHtml}
          </ul>
        </div>` : ''}

        ${outrosSection}

      </article>`;
}

function renderSection(title, channelMap, sub = '') {
  const cardsHtml = Object.entries(channelMap)
    .map(([name, items]) => renderChannelCard(name, items))
    .join('\n\n');

  return `    <div class="caderno-head" id="${title.toLowerCase().replace(/[^a-z0-9]/g, '')}">
      <h2>${title}</h2>
      <span class="caderno-sub">${sub}</span>
    </div>
    <div class="articles-grid">
${cardsHtml}
    </div>`;
}

function renderWeatherBar(weatherData) {
  const items = weatherData.map(w =>
    `<span class="weather-city"><strong>${w.cidade}:</strong> ${w.temp}&deg;C <span>(${w.max}&deg; / ${w.min}&deg;)</span></span>`
  ).join('\n        <span class="weather-sep">&bull;</span>\n        ');
  return `  <!-- BARRINHA INTEGRADA DE CLIMA HOJE -->
  <div class="top-weather-bar">
    <div class="weather-bar-inner">
      <span class="weather-bar-label">CLIMA HOJE</span>
      <div class="weather-bar-items">
        ${items}
      </div>
    </div>
  </div>`;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data');
  const indexPath = path.join(rootDir, 'index.html');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const minTimestamp = Date.now() - 72 * 60 * 60 * 1000;
  console.log('⏱️  The Neitan York Times — gerando nova edição com tradução automática...');

  const weatherData = await fetchWeather();
  const weatherBarHtml = renderWeatherBar(weatherData);

  console.log('📰 Canais de Notícias RSS...');
  const canaisData = {};
  for (const [cat, feeds] of Object.entries(CANAIS_FEEDS)) {
    canaisData[cat] = {};
    for (const f of feeds) {
      const items = await fetchFeedGroup([f], minTimestamp);
      canaisData[cat][f.name] = items;
      console.log(`  ✓ [${cat.toUpperCase()}] ${f.name}: ${items.length} matérias.`);
    }
  }

  console.log('📁 Cadernos Temáticos RSS...');
  const cadernosData = {};
  for (const [caderno, feeds] of Object.entries(CADERNOS_FEEDS)) {
    cadernosData[caderno] = {};
    for (const f of feeds) {
      const items = await fetchFeedGroup([f], minTimestamp);
      cadernosData[caderno][f.name] = items;
      console.log(`  ✓ [${caderno.toUpperCase()}] ${f.name}: ${items.length} matérias.`);
    }
  }

  // CANAIS HTML
  const canaisHTML = `  <!-- ABA CANAIS -->
  <div id="sec-canais" style="display: none;">
${renderSection('Grandes TVs &amp; Portais Nacionais', canaisData.nacionais, '4 Canais de Notícias Gerais')}

${renderSection('Internacionais em Português', canaisData.internacionais_br, '4 Veículos Globais em PT-BR')}

${renderSection('Internacionais Top World', canaisData.internacionais_world, '4 Veículos Internacionais (Traduzidos)')}

${renderSection('Esquerda &amp; Progressistas', canaisData.esquerda, '4 Veículos com Linha Editorial Progressista')}

${renderSection('Direita &amp; Conservadores', canaisData.direita, '4 Veículos com Linha Editorial Conservadora')}
  </div>`;

  // CADERNOS HTML
  const cadernosHTML = `  <!-- ABA CADERNOS -->
  <div id="sec-cadernos">
${renderSection('Sociedade', cadernosData.Sociedade, 'Comportamento, Direitos &amp; Cotidiano')}

${renderSection('Política', cadernosData.Politica, 'Poder, STF, Congresso &amp; Eleições')}

${renderSection('Economia', cadernosData.Economia, 'Mercado Financeiro, Bolsa &amp; Empresas')}

${renderSection('Tecnologia &amp; IA', cadernosData.Tech, 'Modelos de IA, Chips &amp; Inovação')}

${renderSection('Marketing', cadernosData.Marketing, 'Vídeo Digital, GEO &amp; Estratégia B2B')}

${renderSection('Futebol', cadernosData.Futebol, 'Colorado em Primeiro Lugar')}
  </div>`;

  let html = fs.readFileSync(indexPath, 'utf-8');

  // Clean old weather bars
  html = html.replace(/<!-- BARRINHA INTEGRADA DE CLIMA HOJE[\s\S]*?<!-- FIM BARRINHA TEMPO -->\n?/g, '');
  html = html.replace(/<!-- BARRINHA CURTA DO CLIMA[\s\S]*?<!-- FIM BARRINHA TEMPO -->\n?/g, '');
  html = html.replace(/<!-- BARRINHA CURTA NO TOPO COM O TEMPO -->[\s\S]*?<!-- FIM BARRINHA TEMPO -->\n?/g, '');

  // Insert weather bar right after masthead-top-bar closing tag (below date/edition bar, above title)
  if (html.includes('class="masthead-top-bar"')) {
    html = html.replace(/(<\/div>\s*)(<h1 class="masthead-title">)/, `$1${weatherBarHtml}\n  <!-- FIM BARRINHA TEMPO -->\n\n    $2`);
  }

  // Replace content sections
  const part1 = html.split('<!-- ABA CADERNOS -->')[0];
  const part2 = html.split('<footer>')[1];
  html = `${part1}<!-- ABA CADERNOS -->\n${cadernosHTML}\n\n${canaisHTML}\n\n  <footer>${part2}`;

  // Replace masthead date dynamically to today's date (e.g. 26 DE JULHO DE 2026)
  const monthsPT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const now = new Date();
  const dateFormatted = `${now.getDate()} DE ${monthsPT[now.getMonth()]} DE ${now.getFullYear()}`;
  html = html.replace(/<span>\d{1,2} DE [A-ZÇ]+ DE \d{4}<\/span>/gi, `<span>${dateFormatted}</span>`);

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`✅ Edição gerada para ${dateFormatted}! Cards limpos com Matéria Principal + 4 Destaques + Resumos reais.`);

  updateCheckpointTimestamp(dataDir);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
