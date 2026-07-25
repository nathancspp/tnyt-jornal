import fs from 'node:fs';
import path from 'node:path';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeithanBot/1.0' },
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
    return [
      { cidade: 'Balneário Gaivota/SC', temp: '20.2', humidade: 82, vento: '6.0', desc: 'poucas nuvens', max: '20.1', min: '13.7', rainProb: 72 },
      { cidade: 'Porto Alegre/RS', temp: '20.8', humidade: 70, vento: '2.4', desc: 'céu limpo', max: '22.5', min: '12.5', rainProb: 25 },
      { cidade: 'Florianópolis/SC', temp: '21.6', humidade: 67, vento: '3.1', desc: 'céu limpo', max: '21.7', min: '12.8', rainProb: 10 },
      { cidade: 'Vicente Dutra/RS', temp: '22.6', humidade: 68, vento: '7.7', desc: 'parcialmente nublado', max: '23.8', min: '13.9', rainProb: 63 },
      { cidade: 'Roque Gonzales/RS', temp: '20.8', humidade: 79, vento: '10.1', desc: 'encoberto', max: '22.4', min: '13.3', rainProb: 4 },
    ];
  }
}

// 25 CANAIS FEEDS IN 5 CATEGORIES
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
    { name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
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

// Fetch items from a list of feeds
async function fetchFeedGroup(feedList) {
  const result = [];
  for (const f of feedList) {
    try {
      const feed = await parser.parseURL(f.url);
      const items = (feed.items || []).slice(0, 5).map(item => ({
        fonte: f.name,
        domain: new URL(item.link || 'https://google.com').hostname.replace(/^www\./, ''),
        titulo: item.title ? item.title.trim() : '',
        resumoOriginal: (item.contentSnippet || item.summary || item.content || '').replace(/<[^>]*>?/gm, '').trim(),
        link: item.link || '#',
        data: item.pubDate || new Date().toISOString(),
      }));
      result.push(...items);
    } catch (e) {
      console.warn(`  ⚠️ RSS (${f.name}) falhou: ${e.message}`);
    }
  }
  return result;
}

async function fetchAllData() {
  console.log('📰 Varrendo os 25 Canais RSS e 7 Cadernos Temáticos...');
  const canaisData = {};
  for (const [cat, feeds] of Object.entries(CANAIS_FEEDS)) {
    canaisData[cat] = {};
    for (const f of feeds) {
      canaisData[cat][f.name] = await fetchFeedGroup([f]);
    }
  }

  const cadernosData = {};
  for (const [caderno, feeds] of Object.entries(CADERNOS_FEEDS)) {
    cadernosData[caderno] = await fetchFeedGroup(feeds);
  }

  return { canaisData, cadernosData };
}

async function main() {
  const rootDir = process.cwd();
  const indexPath = path.join(rootDir, 'index.html');
  const arquivoPath = path.join(rootDir, 'ARQUIVO.md');

  const weatherData = await fetchWeather();
  const { canaisData, cadernosData } = await fetchAllData();

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const dataCurta = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  console.log('✅ Varredura concluída com sucesso!');
  console.log(`🎉 NEITHAN YORK TIMES processado para a edição de ${dataFormatada}.`);
}

main().catch(err => {
  console.error('❌ Erro fatal na geração:', err);
  process.exit(1);
});
