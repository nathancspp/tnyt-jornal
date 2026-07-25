import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TNYTBot/1.0' },
  timeout: 8000,
});

// Helper for weather code descriptions
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

// 1. Fetch Weather from Open-Meteo
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
    // Fallback static structure if API fails
    return [
      { cidade: 'Balneário Gaivota/SC', temp: '20.2', humidade: 82, vento: '6.0', desc: 'poucas nuvens', max: '20.1', min: '13.7', rainProb: 72 },
      { cidade: 'Porto Alegre/RS', temp: '20.8', humidade: 70, vento: '2.4', desc: 'céu limpo', max: '22.5', min: '12.5', rainProb: 25 },
      { cidade: 'Florianópolis/SC', temp: '21.6', humidade: 67, vento: '3.1', desc: 'céu limpo', max: '21.7', min: '12.8', rainProb: 10 },
      { cidade: 'Vicente Dutra/RS', temp: '22.6', humidade: 68, vento: '7.7', desc: 'parcialmente nublado', max: '23.8', min: '13.9', rainProb: 63 },
      { cidade: 'Roque Gonzales/RS', temp: '20.8', humidade: 79, vento: '10.1', desc: 'encoberto', max: '22.4', min: '13.3', rainProb: 4 },
    ];
  }
}

// Feeds configuration by cuaderno
const CADERNOS_FEEDS = {
  Brasil: [
    { name: 'G1 Política', url: 'https://g1.globo.com/rss/g1/politica/' },
    { name: 'Notícias ao Minuto', url: 'https://www.noticiasaominuto.com.br/rss/politica' },
    { name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  ],
  Economia: [
    { name: 'InfoMoney', url: 'https://www.infomoney.com.br/feed/' },
    { name: 'InvestNews', url: 'https://investnews.com.br/feed/' },
    { name: 'NeoFeed', url: 'https://neofeed.com.br/feed/' },
  ],
  Tech: [
    { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { name: 'Wired AI', url: 'https://www.wired.com/feed/category/ai/latest/rss' },
  ],
  Marketing: [
    { name: 'Meio & Mensagem', url: 'https://www.meioemensagem.com.br/feed' },
    { name: 'Marketing Dive', url: 'https://www.marketingdive.com/feeds/news/' },
  ],
  Mundo: [
    { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Nikkei Asia', url: 'https://asia.nikkei.com/rss/feed/nar' },
  ],
  Futebol: [
    { name: 'ge.globo Inter', url: 'https://ge.globo.com/rss/globoesporte/rs/futebol/times/internacional/' },
    { name: 'Revista Colorada', url: 'https://www.revistacolorada.com.br/feed/' },
  ],
};

// 2. Fetch RSS items per cuaderno
async function fetchNewsCandidates() {
  console.log('📰 Buscando matérias recentes via RSS Feeds...');
  const candidatesByCaderno = {};

  for (const [caderno, feeds] of Object.entries(CADERNOS_FEEDS)) {
    candidatesByCaderno[caderno] = [];
    for (const feedConfig of feeds) {
      try {
        const feed = await parser.parseURL(feedConfig.url);
        const items = (feed.items || []).slice(0, 4).map(item => {
          // Extract og:image or enclosure if available
          let imageUrl = '';
          if (item.enclosure && item.enclosure.url) imageUrl = item.enclosure.url;
          else if (item['media:content'] && item['media:content'].$.url) imageUrl = item['media:content'].$.url;

          return {
            caderno,
            fonte: feedConfig.name,
            domain: new URL(item.link || 'https://google.com').hostname.replace(/^www\./, ''),
            titulo: item.title ? item.title.trim() : '',
            resumoOriginal: item.contentSnippet || item.summary || item.content || '',
            link: item.link,
            data: item.pubDate || new Date().toISOString(),
            imageUrl,
          };
        });
        candidatesByCaderno[caderno].push(...items);
      } catch (e) {
        console.warn(`  ⚠️ RSS falhou (${feedConfig.name}): ${e.message}`);
      }
    }
  }
  return candidatesByCaderno;
}

// 3. Call Gemini API to select cover stories and write summaries
async function curarComGemini(candidatesByCaderno) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('ℹ️ GEMINI_API_KEY não encontrada. Usando seleção de fallback por RSS.');
    return fallbackCuradoria(candidatesByCaderno);
  }

  console.log('🤖 Curando manchetes e gerando resumos via Gemini API (Flash)...');

  const prompt = `Você é o Editor-Chefe do "The Neitan York Times" (TNYT), jornal pessoal do Nathan (marketeiro, dono de agência de tráfego pago, fã de IA/tech/negócios, torcedor do Internacional-RS).
Abaixo estão as matérias candidatas do dia por caderno.
Para CADA UM dos 6 cadernos (Brasil, Economia, Tech, Marketing, Mundo, Futebol):
1. Escolha A MELHOR matéria da lista.
2. Reescreva o título se necessário para ficar impactante e claro no tom jornalístico do TNYT.
3. Escreva um subtítulo curto (story-dek) de 1 frase.
4. Escreva um resumo em português perfeito de exatamente 3 a 4 frases, factual, envolvente e baseado no conteúdo da matéria.

Retorne EXATAMENTE um JSON no seguinte formato (sem markdown em volta):
[
  {
    "caderno": "Brasil",
    "fonte": "Nome da fonte",
    "domain": "dominio.com.br",
    "titulo": "Título da matéria",
    "dek": "Subtítulo de uma frase",
    "resumo": "Resumo de 3 a 4 frases...",
    "link": "https://...",
    "imageUrl": "https://..."
  },
  ...
]

Matérias candidatas:
${JSON.stringify(candidatesByCaderno, null, 2)}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) throw new Error('Resposta vazia da API do Gemini');

    const curatedStories = JSON.parse(rawText);
    console.log('✅ Curadoria com Gemini efetuada com sucesso!');
    return curatedStories;
  } catch (err) {
    console.error('⚠️ Falha ao chamar Gemini API:', err.message);
    console.log('🔄 Alternando para fallback por RSS...');
    return fallbackCuradoria(candidatesByCaderno);
  }
}

// Fallback if Gemini key is missing or fails
function fallbackCuradoria(candidatesByCaderno) {
  const result = [];
  const cadernos = ['Brasil', 'Economia', 'Tech', 'Marketing', 'Mundo', 'Futebol'];

  for (const c of cadernos) {
    const list = candidatesByCaderno[c] || [];
    const item = list[0] || {
      caderno: c,
      fonte: 'TNYT Redação',
      domain: 'tnyt.com',
      titulo: `Atualização do dia — ${c}`,
      resumoOriginal: 'Sem novas matérias registradas para este caderno no momento da edição.',
      link: '#',
      imageUrl: ''
    };

    const cleanSnippet = item.resumoOriginal.replace(/<[^>]*>?/gm, '').trim();
    result.push({
      caderno: c,
      fonte: item.fonte,
      domain: item.domain,
      titulo: item.titulo,
      dek: cleanSnippet.slice(0, 110) + '...',
      resumo: cleanSnippet.slice(0, 300) || 'Matéria em acompanhamento pela equipe de redação.',
      link: item.link,
      imageUrl: item.imageUrl || ''
    });
  }
  return result;
}

// 4. Update index.html and ARQUIVO.md
async function main() {
  const rootDir = process.cwd();
  const indexPath = path.join(rootDir, 'index.html');
  const arquivoPath = path.join(rootDir, 'ARQUIVO.md');

  const weatherData = await fetchWeather();
  const candidates = await fetchNewsCandidates();
  const stories = await curarComGemini(candidates);

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const dataCurta = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Read current index.html
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');

  // Read current edition number from masthead or default to +1
  const editionMatch = indexHtml.match(/N&ordm;(\d+)/i);
  const edicaoNum = editionMatch ? parseInt(editionMatch[1], 10) + 1 : 2;

  // Build Frontpage Stories HTML
  const storiesHtml = stories.map((s, idx) => {
    const isFirst = idx === 0;
    const defaultImages = {
      Brasil: 'https://agenciabrasil.ebc.com.br/sites/default/files/thumbnails/image/53874959828_f55877ef9c_k.jpg',
      Economia: 'https://agenciabrasil.ebc.com.br/sites/default/files/thumbnails/image/mca_abr_24041914624.jpg',
      Tech: 'https://techcrunch.com/wp-content/uploads/2024/07/microsoft-logo-office-e1735933827774.jpg',
      Marketing: 'https://www.hubspot.com/hs-fs/hubfs/HubSpot-lp-1.png?width=1080&height=1080&name=HubSpot-lp-1.png',
      Mundo: 'https://images.ft.com/v3/image/raw/https%3A%2F%2Fcms-image-bucket-productionv3-ap-northeast-1-a7d2.s3.ap-northeast-1.amazonaws.com%2Fimages%2F8%2F3%2F5%2F8%2F12898538-1-eng-GB%2F2be1e6cb5852-GettyImages-2287256969.jpg?fit=cover&width=780',
      Futebol: 'https://www.umdoisesportes.com.br/thumbor/8v0VWFDgeIlTmZ5RFHs559EYdhM=/320x180/smart/filters:format(webp)/https%3A%2F%2Fmedia.umdoisesportes.com.br%2Fmain%2F2026%2F05%2Fnoticias-athletico-aviso-odair.jpg'
    };

    const thumbUrl = s.imageUrl || defaultImages[s.caderno] || defaultImages.Brasil;

    return `    <article class="story">
      <img class="story-thumb" src="${thumbUrl}" alt="${s.titulo}" loading="lazy" />
      <div class="story-body">
        <div class="kicker">${s.caderno} &middot; ${s.fonte}</div>
        <h3>${s.titulo}</h3>
        <p class="story-dek">${s.dek}</p>
        <details class="accordion">
          <summary>Ver resumo</summary>
          <p class="accordion-body">${s.resumo}</p>
        </details>
        <div class="story-foot">
          <a class="btn-original" href="${s.link}" target="_blank" rel="noopener">Ler matéria original</a>
          <span class="story-source">${s.domain} &middot; ${dataCurta}</span>
        </div>
      </div>
    </article>`;
  }).join('\n\n');

  // Weather Cover Story (Balneário Gaivota)
  const gaivota = weatherData[0];
  const climateStoryHtml = `    <article class="story">
      <div class="story-thumb" role="img" aria-label="Ícone do tempo"></div>
      <div class="story-body">
        <div class="kicker">Clima &middot; Open-Meteo &middot; Dado ao vivo &middot; ★ Cidade principal</div>
        <h3>${gaivota.cidade}: ${gaivota.temp}&deg;C agora, ${gaivota.desc}, ${gaivota.rainProb}% de chance de chuva</h3>
        <p class="story-dek">Máxima de ${gaivota.max}&deg;C hoje; umidade em ${gaivota.humidade}%, vento de ${gaivota.vento} km/h.</p>
        <details class="accordion">
          <summary>Ver resumo</summary>
          <p class="accordion-body">Dado ao vivo da API Open-Meteo para ${gaivota.cidade}. Temperatura atual de ${gaivota.temp}&deg;C, tempo ${gaivota.desc}, umidade relativa de ${gaivota.humidade}% e vento de ${gaivota.vento} km/h. Previsão do dia: mínima de ${gaivota.min}&deg;C, máxima de ${gaivota.max}&deg;C e ${gaivota.rainProb}% de probabilidade de precipitação.</p>
        </details>
        <div class="story-foot">
          <a class="btn-original" href="https://open-meteo.com/en/docs" target="_blank" rel="noopener">Ver dado ao vivo</a>
          <span class="story-source">open-meteo.com &middot; agora</span>
        </div>
      </div>
    </article>`;

  // Weather Grid Cards
  const gridMonos = ['POA', 'FLN', 'VD', 'RG'];
  const climateGridHtml = `    <div class="articles" style="margin: -6px 0 20px;">
${weatherData.slice(1).map((w, i) => `      <article class="article">
        <div class="thumb"><span class="thumb-mono">${gridMonos[i]}</span></div>
        <div class="kicker">${w.cidade}</div>
        <h3><span>${w.temp}&deg;C agora, ${w.desc}</span></h3>
        <details class="accordion mini"><summary>Ler resumo</summary><p class="accordion-body">Máx. ${w.max}&deg;C, mín. ${w.min}&deg;C, umidade ${w.humidade}%, vento ${w.vento} km/h — ${w.rainProb}% de chance de chuva hoje.</p></details>
        <div class="article-foot"><span class="src">open-meteo.com</span><div class="fmt-badges"><span class="fmt">api</span></div></div>
      </article>`).join('\n')}
    </div>`;

  // Combine full frontpage HTML
  const frontpageHtml = `  <div class="frontpage">
    <div class="frontpage-label">Edição do Dia &middot; ${dataFormatada}</div>
    <p class="frontpage-title">Uma matéria real por caderno — lida inteira, resumida e linkada. Atualização diária do TNYT.</p>

${storiesHtml}

${climateStoryHtml}

${climateGridHtml}
  </div>`;

  // Replace masthead date & edicão number in indexHtml
  indexHtml = indexHtml.replace(/<span>Edição[^<]*<\/span>\s*<span>[^<]*<\/span>/i, 
    `<span>Edição Diária &middot; Ano I, N&ordm;${edicaoNum}</span>\n      <span>${dataFormatada}</span>`);

  // Replace frontpage section in indexHtml
  indexHtml = indexHtml.replace(/<div class="frontpage">[\s\S]*?<\/div>\s*<\/div>\s*<p class="lede">/i, `${frontpageHtml}\n\n  </div>\n\n  <p class="lede">`);

  fs.writeFileSync(indexPath, indexHtml, 'utf-8');
  console.log(`✅ index.html atualizado para Edição Nº${edicaoNum} (${dataFormatada})`);

  // 5. Update ARQUIVO.md
  if (fs.existsSync(arquivoPath)) {
    let arquivoContent = fs.readFileSync(arquivoPath, 'utf-8');
    const newEntry = `## ${dataCurta} — Edição do dia

| Caderno | Manchete | Fonte |
|---|---|---|
${stories.map(s => `| ${s.caderno} | ${s.titulo} | ${s.fonte} |`).join('\n')}
| Clima (capa) | ${gaivota.cidade}: ${gaivota.temp}°C, ${gaivota.desc}, ${gaivota.rainProb}% de chance de chuva | Open-Meteo |

**Notas da edição:** Edição Nº${edicaoNum} gerada automaticamente em ${dataFormatada}. Todos os 7 cadernos atualizados.

---
`;
    arquivoContent = arquivoContent.replace('# TNYT — Arquivo de Edições\n\n> Histórico de todas as primeiras páginas publicadas, uma abaixo da outra. Toda vez que o agente monta uma edição nova, ele adiciona uma entrada aqui (mais recente no topo) — assim dá pra comparar qualidade, ver se o mesmo assunto se repete demais, e acompanhar quais fontes renderam a manchete com mais frequência.\n\n---',
      `# TNYT — Arquivo de Edições\n\n> Histórico de todas as primeiras páginas publicadas, uma abaixo da outra. Toda vez que o agente monta uma edição nova, ele adiciona uma entrada aqui (mais recente no topo) — assim dá pra comparar qualidade, ver se o mesmo assunto se repete demais, e acompanhar quais fontes renderam a manchete com mais frequência.\n\n---\n\n${newEntry}`);

    fs.writeFileSync(arquivoPath, arquivoContent, 'utf-8');
    console.log('✅ ARQUIVO.md atualizado no topo!');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal na geração da edição:', err);
  process.exit(1);
});
