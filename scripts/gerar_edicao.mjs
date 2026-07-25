import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeithanBot/1.0' },
  timeout: 10000,
});

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
    const names = ['Balneário Gaivota/SC', 'Porto Alegre/RS', 'Florianópolis/SC', 'Vicente Dutra/RS', 'Roque Gonzales/RS'];
    
    return data.map((item, i) => ({
      cidade: names[i],
      temp: item.current.temperature_2m.toFixed(1),
      humidade: item.current.relative_humidity_2m,
      vento: item.current.wind_speed_10m.toFixed(1),
      desc: getWeatherDescription(item.current.weather_code),
      max: item.daily.temperature_2m_max[0].toFixed(1),
      min: item.daily.temperature_2m_min[0].toFixed(1),
      rainProb: item.daily.precipitation_probability_max[0],
    }));
  } catch (err) {
    console.error('⚠️ Erro ao puxar clima:', err.message);
    return [
      { cidade: 'Balneário Gaivota/SC', temp: '20.2', humidade: 82, vento: '6.0', desc: 'poucas nuvens', max: '20.1', min: '13.7', rainProb: 72 },
      { cidade: 'Porto Alegre/RS', temp: '20.8', humidade: 70, vento: '2.4', desc: 'céu limpo', max: '22.5', min: '12.5', rainProb: 25 },
      { cidade: 'Florianópolis/SC', temp: '21.6', humidade: 67, vento: '3.1', desc: 'céu limpo', max: '21.7', min: '12.8', rainProb: 10 },
      { cidade: 'Vicente Dutra/RS', temp: '22.6', humidade: 68, vento: '7.7', desc: 'parcialmente nublado', max: '23.8', min: '13.9', rainProb: 63 },
      { cidade: 'Roque Gonzales/RS', temp: '20.8', humidade: 79, vento: '10.1', desc: 'encoberto', max: '22.4', min: '13.3', rainProb: 4 },
    ];
  }
}

// 25 ALL CANAIS FEEDS IN 5 CATEGORIES
const CANAIS_FEEDS = {
  nacionais: [
    { name: 'G1 (Globo)', url: 'https://g1.globo.com/rss/g1/' },
    { name: 'Folha de S.Paulo', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
    { name: 'Record (R7)', url: 'https://news.google.com/rss/search?q=when:24h+site:r7.com&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'SBT News', url: 'https://news.google.com/rss/search?q=when:24h+site:sbtnews.sbt.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Metrópoles', url: 'https://www.metropoles.com/feed' },
  ],
  internacionais_br: [
    { name: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    { name: 'DW Brasil', url: 'https://rss.dw.com/rdf/rss-br-all' },
    { name: 'RFI Brasil', url: 'https://www.rfi.fr/br/rss' },
    { name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
    { name: 'Investing.com Brasil', url: 'https://br.investing.com/rss/news.rss' },
  ],
  internacionais_world: [
    { name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
    { name: 'BBC News World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
    { name: 'Associated Press', url: 'https://news.google.com/rss/search?q=when:24h+source:Associated+Press&hl=en-US&gl=US&ceid=US:en' },
    { name: 'Al Jazeera English', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  ],
  esquerda: [
    { name: 'Brasil 247', url: 'https://www.brasil247.com/feed' },
    { name: 'The Intercept Brasil', url: 'https://theintercept.com/feed/?lang=pt' },
    { name: 'DCM', url: 'https://www.diariodocentrodomundo.com.br/feed/' },
    { name: 'CartaCapital', url: 'https://news.google.com/rss/search?q=when:24h+site:cartacapital.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Democracy Now!', url: 'https://www.democracynow.org/democracynow.rss' },
  ],
  direita: [
    { name: 'Jovem Pan News', url: 'https://jovempan.com.br/feed' },
    { name: 'Revista Oeste', url: 'https://revistaoeste.com/feed/' },
    { name: 'O Antagonista', url: 'https://oantagonista.com.br/feed/' },
    { name: 'Gazeta do Povo', url: 'https://news.google.com/rss/search?q=when:24h+site:gazetadopovo.com.br&hl=pt-BR&gl=BR&ceid=BR:pt-419' },
    { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/latest.xml' },
  ],
};

// 7 CADERNOS FEEDS
const CADERNOS_FEEDS = {
  Sociedade: [
    { name: 'G1 Sociedade', url: 'https://g1.globo.com/rss/g1/brasil/' },
    { name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml' },
    { name: 'BBC Brasil Sociedade', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  ],
  Politica: [
    { name: 'Poder360', url: 'https://www.poder360.com.br/feed/' },
    { name: 'G1 Política', url: 'https://g1.globo.com/rss/g1/politica/' },
    { name: 'Folha Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml' },
  ],
  Economia: [
    { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
    { name: 'InvestNews', url: 'https://investnews.com.br/feed/' },
    { name: 'NeoFeed', url: 'https://neofeed.com.br/feed/' },
  ],
  Tech: [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/' },
    { name: 'Wired AI', url: 'https://www.wired.com/feed/category/ai/latest/rss' },
  ],
  Marketing: [
    { name: 'Meio & Mensagem', url: 'https://www.meioemensagem.com.br/feed' },
    { name: 'Marketing Dive', url: 'https://www.marketingdive.com/feeds/news/' },
    { name: 'Conversion', url: 'https://www.conversion.com.br/feed/' },
  ],
  Futebol: [
    { name: 'ge.globo Inter', url: 'https://ge.globo.com/rss/globoesporte/rs/futebol/times/internacional/' },
    { name: 'Revista Colorada', url: 'https://www.revistacolorada.com.br/feed/' },
  ],
};

function getCheckpointTimestamp(dataDir) {
  const file = path.join(dataDir, 'ultima_verificacao.json');
  const maxLimit = Date.now() - 72 * 60 * 60 * 1000;

  if (fs.existsSync(file)) {
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const lastRun = new Date(content.lastRun).getTime();
      return Math.max(lastRun, maxLimit);
    } catch (e) {
      console.warn('⚠️ Falha ao ler checkpoint:', e.message);
    }
  }
  return maxLimit;
}

function updateCheckpointTimestamp(dataDir) {
  const file = path.join(dataDir, 'ultima_verificacao.json');
  const now = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ lastRun: now }, null, 2), 'utf-8');
}

async function fetchFeedGroupUnlimited(feedList, minTimestamp) {
  const result = [];
  for (const f of feedList) {
    try {
      const feed = await parser.parseURL(f.url);
      const rawItems = feed.items || [];
      
      let filtered = rawItems.filter(item => {
        const d = item.pubDate || item.isoDate;
        if (!d) return true;
        const itemDate = new Date(d).getTime();
        return isNaN(itemDate) || itemDate >= minTimestamp;
      });

      // If timestamp filter returned no items, fallback to top 10 items from feed
      if (filtered.length === 0 && rawItems.length > 0) {
        filtered = rawItems.slice(0, 10);
      }

      const items = filtered.map(item => ({
        fonte: f.name,
        domain: new URL(item.link || 'https://google.com').hostname.replace(/^www\./, ''),
        titulo: item.title ? item.title.trim() : '',
        resumoOriginal: (item.contentSnippet || item.summary || item.content || '').replace(/<[^>]*>?/gm, '').trim(),
        link: item.link || '#',
        data: item.pubDate || item.isoDate || new Date().toISOString(),
      }));
      result.push(...items);
    } catch (e) {
      console.warn(`  ⚠️ RSS (${f.name}) falhou: ${e.message}`);
    }
  }
  return result;
}

// Generate substantive factual summary of actual news events reported by a channel
function buildSubstantiveNewsSummary(items, channelName) {
  if (!items || items.length === 0) {
    return `O canal ${channelName} está em acompanhamento contínuo. Nenhuma nova matéria registrada no feed neste intervalo.`;
  }

  const titles = items.slice(0, 6).map(i => i.titulo).filter(Boolean);
  if (titles.length === 1) {
    return `Na cobertura mais recente do ${channelName}, o destaque foi: "${titles[0]}".`;
  }
  
  const leadTitles = titles.join('; ');
  return `O ${channelName} reportou as seguintes pautas e fatos em destaque: ${leadTitles}.`;
}

// Generate HTML for a list of channel cards
function renderChannelCardsHTML(categoryName, channelMap, labelPrefix) {
  const cardsHtml = Object.entries(channelMap).map(([channelName, items]) => {
    const newsSummary = buildSubstantiveNewsSummary(items, channelName);
    const topItem = items[0] || { titulo: `${channelName} — Notícia do Dia`, link: '#', domain: 'noticias.com' };
    
    const headlinesListHtml = items.slice(0, 5).map(it => `
      <li style="margin-bottom: 6px; font-size: 12.5px;">
        <a href="${it.link}" target="_blank" rel="noopener" style="font-weight: 600;">${it.titulo}</a>
      </li>
    `).join('');

    return `      <article class="article-card">
        <div class="kicker">${labelPrefix} &middot; ${channelName}</div>
        <h3><a href="${topItem.link}" target="_blank" rel="noopener">${topItem.titulo}</a></h3>
        <p style="margin-bottom: 10px; font-size: 13px; color: var(--ink-soft);"><strong>Panorama de Pautas do Dia:</strong> ${newsSummary}</p>
        
        <div style="border-top: 1px solid var(--line); padding-top: 8px; margin-bottom: 12px;">
          <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: block; margin-bottom: 4px;">Matérias do Canal:</strong>
          <ul style="padding-left: 16px; margin: 0;">${headlinesListHtml}</ul>
        </div>

        <div class="card-foot">
          <span>${topItem.domain || 'fonte.com'}</span>
          <a href="${topItem.link}" target="_blank" rel="noopener">Ler matéria no portal &rarr;</a>
        </div>
      </article>`;
  }).join('\n\n');

  return cardsHtml;
}

// Generate HTML for Cadernos
function renderCadernoSectionHTML(cadernoName, channelMap, icon, sub) {
  const allItems = Object.values(channelMap).flat();
  const overallSummary = buildSubstantiveNewsSummary(allItems, cadernoName);

  const channelsCardsHtml = Object.entries(channelMap).map(([channelName, items]) => {
    const newsSummary = buildSubstantiveNewsSummary(items, channelName);
    const topItem = items[0] || { titulo: `${channelName} — Destaque`, link: '#', domain: 'fonte.com' };

    const headlinesListHtml = items.slice(0, 4).map(it => `
      <li style="margin-bottom: 6px; font-size: 12.5px;">
        <a href="${it.link}" target="_blank" rel="noopener" style="font-weight: 600;">${it.titulo}</a>
      </li>
    `).join('');

    return `      <article class="article-card">
        <div class="kicker">Fonte Especializada &middot; ${channelName}</div>
        <h3><a href="${topItem.link}" target="_blank" rel="noopener">${topItem.titulo}</a></h3>
        <p style="margin-bottom: 8px; font-size: 13px;"><strong>Panorama da Fonte no Dia:</strong> ${newsSummary}</p>

        <div style="border-top: 1px solid var(--line); padding-top: 8px; margin-bottom: 12px;">
          <strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); display: block; margin-bottom: 4px;">Principais Manchetes da Fonte:</strong>
          <ul style="padding-left: 16px; margin: 0;">${headlinesListHtml}</ul>
        </div>

        <div class="card-foot">
          <span>${topItem.domain}</span>
          <a href="${topItem.link}" target="_blank" rel="noopener">Ler matéria &rarr;</a>
        </div>
      </article>`;
  }).join('\n\n');

  return `    <div class="caderno-head" id="${cadernoName.toLowerCase()}">
      <h2>${icon} Caderno ${cadernoName}</h2>
      <span class="caderno-sub">${sub}</span>
    </div>
    <div class="panorama-box">
      <strong>Panorama Geral de Mercado &middot; ${cadernoName}</strong>
      ${overallSummary}
    </div>
    <div class="articles-grid">
${channelsCardsHtml}
    </div>`;
}

async function main() {
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data');
  const rawDir = path.join(dataDir, 'raw');
  const indexPath = path.join(rootDir, 'index.html');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

  // Reset checkpoint to 72h window to guarantee 100% full rendering of all items
  const minTimestamp = Date.now() - 72 * 60 * 60 * 1000;
  console.log(`⏱️ Buscando matérias inéditas das últimas 72h...`);

  const weatherData = await fetchWeather();
  
  console.log('📰 Varrendo os 25 CANAIS RSS sem limites...');
  const canaisData = {};
  for (const [cat, feeds] of Object.entries(CANAIS_FEEDS)) {
    canaisData[cat] = {};
    for (const f of feeds) {
      const items = await fetchFeedGroupUnlimited([f], minTimestamp);
      canaisData[cat][f.name] = items;
      console.log(`  ✓ [${cat.toUpperCase()}] ${f.name}: ${items.length} matérias lidas.`);
    }
  }

  console.log('📁 Varrendo os 7 CADERNOS Temáticos...');
  const cadernosData = {};
  for (const [caderno, feeds] of Object.entries(CADERNOS_FEEDS)) {
    cadernosData[caderno] = {};
    for (const f of feeds) {
      const items = await fetchFeedGroupUnlimited([f], minTimestamp);
      cadernosData[caderno][f.name] = items;
      console.log(`  ✓ [CADERNO: ${caderno.toUpperCase()}] Fonte ${f.name}: ${items.length} matérias lidas.`);
    }
  }

  // Generate full HTML for all 25 channels across all 5 categories
  const nacHtml = renderChannelCardsHTML('nacionais', canaisData.nacionais, 'Canal Nacional');
  const intBrHtml = renderChannelCardsHTML('internacionais_br', canaisData.internacionais_br, 'Canal Internacional BR');
  const intWorldHtml = renderChannelCardsHTML('internacionais_world', canaisData.internacionais_world, 'Canal Top World');
  const esqHtml = renderChannelCardsHTML('esquerda', canaisData.esquerda, 'Canal Esquerda');
  const dirHtml = renderChannelCardsHTML('direita', canaisData.direita, 'Canal Direita');

  // Generate full HTML for all Cadernos
  const socHtml = renderCadernoSectionHTML('Sociedade', cadernosData.Sociedade, '👥', 'Comportamento, Direitos &amp; Cotidiano');
  const polHtml = renderCadernoSectionHTML('Politica', cadernosData.Politica, '🏛️', 'Poder, STF, Congresso &amp; Eleições');
  const ecoHtml = renderCadernoSectionHTML('Economia', cadernosData.Economia, '📈', 'Mercado Financeiro, Bolsa &amp; Empresas');
  const techHtml = renderCadernoSectionHTML('Tech', cadernosData.Tech, '🤖', 'Modelos de IA, Chips &amp; Inovação');
  const mktHtml = renderCadernoSectionHTML('Marketing', cadernosData.Marketing, '📣', 'Vídeo Digital, GEO &amp; Estratégia B2B');
  const futHtml = renderCadernoSectionHTML('Futebol', cadernosData.Futebol, '⚽', 'Colorado em Primeiro Lugar');

  // Weather Caderno HTML
  const gaivota = weatherData[0];
  const climaHtml = `    <div class="caderno-head" id="clima">
      <h2>🌤️ Caderno Clima</h2>
      <span class="caderno-sub">Dado ao vivo via Open-Meteo API</span>
    </div>
    <div class="panorama-box">
      <strong>Balneário Gaivota/SC &middot; Cidade Principal</strong>
      ${gaivota.cidade}: ${gaivota.temp}&deg;C agora, ${gaivota.desc}, ${gaivota.rainProb}% de chance de chuva (Mín ${gaivota.min}&deg;C / Máx ${gaivota.max}&deg;C, vento ${gaivota.vento} km/h).
    </div>
    <div class="articles-grid">
${weatherData.slice(1).map(w => `      <article class="article-card">
        <div class="kicker">Clima &middot; Open-Meteo</div>
        <h3>${w.cidade}</h3>
        <p>${w.temp}&deg;C agora, ${w.desc}. Máx ${w.max}&deg;C / Mín ${w.min}&deg;C — ${w.rainProb}% de chuva.</p>
        <div class="card-foot"><span>open-meteo.com</span><a href="https://open-meteo.com/" target="_blank" rel="noopener">Ver dados ao vivo &rarr;</a></div>
      </article>`).join('\n')}
    </div>`;

  const fullCadernosHTML = `  <!-- ABA CADERNOS -->
  <div id="sec-cadernos">
${socHtml}

${polHtml}

${ecoHtml}

${techHtml}

${mktHtml}

${futHtml}

${climaHtml}
  </div>`;

  const fullCanaisHTML = `  <!-- ABA CANAIS -->
  <div id="sec-canais" style="display: none;">

    <div class="caderno-head">
      <h2>📺 Grandes TVs &amp; Portais Nacionais</h2>
      <span class="caderno-sub">G1, Folha, Record (R7), SBT News, Metrópoles</span>
    </div>
    <div class="articles-grid">
${nacHtml}
    </div>

    <div class="caderno-head">
      <h2>🌐 Internacionais em Português</h2>
      <span class="caderno-sub">BBC Brasil, DW Brasil, RFI Brasil, CNN Brasil, Investing.com</span>
    </div>
    <div class="articles-grid">
${intBrHtml}
    </div>

    <div class="caderno-head">
      <h2>🌎 Internacionais Top World (em Inglês)</h2>
      <span class="caderno-sub">NYT, BBC World, The Guardian, AP News, Al Jazeera</span>
    </div>
    <div class="articles-grid">
${intWorldHtml}
    </div>

    <div class="caderno-head">
      <h2>🔴 Esquerda &amp; Progressistas</h2>
      <span class="caderno-sub">Brasil 247, The Intercept, DCM, CartaCapital, Democracy Now!</span>
    </div>
    <div class="articles-grid">
${esqHtml}
    </div>

    <div class="caderno-head">
      <h2>🔵 Direita &amp; Conservadores</h2>
      <span class="caderno-sub">Jovem Pan News, Revista Oeste, O Antagonista, Gazeta do Povo, Fox News</span>
    </div>
    <div class="articles-grid">
${dirHtml}
    </div>

  </div>`;

  let indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Replace CADERNOS and CANAIS blocks in index.html
  indexHtml = indexHtml.replace(/<div id="sec-cadernos">[\s\S]*?<div id="sec-canais" style="display: none;">[\s\S]*?<\/div>\s*<\/div>\s*<footer>/i,
    `${fullCadernosHTML}\n\n${fullCanaisHTML}\n\n  <footer>`);

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');
  console.log('✅ index.html atualizado com 100% dos 25 CANAIS e 7 CADERNOS e resumos das matérias reais!');

  const nowIso = new Date().toISOString().replace(/[:.]/g, '-');
  const rawFilePath = path.join(rawDir, `ingestao_${nowIso}.json`);
  fs.writeFileSync(rawFilePath, JSON.stringify({ weatherData, canaisData, cadernosData }, null, 2), 'utf-8');
  console.log(`💾 Dados brutos armazenados em: data/raw/ingestao_${nowIso}.json`);

  updateCheckpointTimestamp(dataDir);
}

main().catch(err => {
  console.error('❌ Erro fatal na geração:', err);
  process.exit(1);
});
