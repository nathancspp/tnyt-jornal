# EDITOR CHEFE — Manual de Regras & Diretrizes Editoriais
## The Neitan York Times

> Versão atualizada em 26/07/2026. Este documento é a fonte da verdade para o agente de automação. Toda nova edição gerada por `node scripts/gerar_edicao.mjs` segue estas regras.

---

## 1. 🏛️ Identidade Editorial

- **Nome Oficial:** *The Neitan York Times*
- **Slogan:** *"All the news that's fit for Nathan" — sem fake news, sem ruído, só o que interessa.*
- **Faixa de Metadados Superior (masthead):** `EDIÇÃO DIÁRIA · ANO I, Nº [N]` | `[DATA COMPLETA]` | `BASE NATHAN & AMANDA`
- **Tipografia:** Título em **Georgia Serif Bold**, dark mode soberano, linha dupla clássica sob o cabeçalho.
- **Layout:** Grade simétrica de 4 colunas. Sem emojis em títulos ou botões.

---

## 2. ⚙️ Automação — Como Rodar

```bash
# Na pasta do projeto:
node scripts/gerar_edicao.mjs
```

O script faz tudo automaticamente:
1. Puxa dados do clima (Open-Meteo API) para 5 cidades
2. Varre todos os feeds RSS (20 canais + 6 cadernos)
3. Traduz notícias em inglês para PT-BR (Google Translate)
4. Filtra e ranqueia por interesse do Nathan
5. Gera o `index.html` com a edição do dia

---

## 3. 🌐 Tradução Automática Obrigatória (EN → PT-BR)

Todas as matérias vindas de veículos em inglês são traduzidas automaticamente:
- The New York Times, BBC News World, The Guardian, Associated Press
- TechCrunch AI, Marketing Dive, Adweek

**Regra:** nenhuma manchete ou resumo em inglês aparece na edição final.

---

## 4. 🎯 Filtros de Interesse do Nathan (por prioridade)

O algoritmo ordena e seleciona matérias por categoria, do maior para menor interesse:

| Prioridade | Categoria | Exemplos de palavras-chave |
|---|---|---|
| 🥇 1ª | **IA** | ChatGPT, OpenAI, LLM, Gemini, Claude, Anthropic, neural, diffusion |
| 🥈 2ª | **Tech** | startup, Apple, Google, NVIDIA, chip, cibersegurança, app, algoritmo |
| 🥉 3ª | **Economia & Negócios** | bolsa, inflação, M&A, IPO, SELIC, B3, CEO, venture capital, exportação |
| 4ª | **Marketing** | publicidade, GEO, SEO, influencer, TikTok, YouTube, performance, growth |
| 5ª | **Política** | STF, Lula, Trump, eleições, Congresso, guerra, geopolítica, tarifas |
| 6ª | **Sociedade** | saúde, ciência, crime, meio ambiente, educação, descoberta |
| 7ª | **Geo/História** | arqueologia, civilização, curiosidade, museu, patrimônio |
| 8ª | **Futebol** | Inter, Colorado, Brasileirão, Libertadores, Beira-Rio |

---

## 5. 📰 Estrutura do Card de Canal (Layout Definitivo)

Cada portal gera um card com esta estrutura exata:

```
┌─────────────────────────────────────────┐
│  NOME DO CANAL                          │
│  dominio.com.br                         │
├─────────────────────────────────────────┤
│  [MATÉRIA PRINCIPAL]                    │
│  [Foto da notícia — loading lazy]       │
│  Título da matéria (link)               │
│  [+ Resumo da Matéria] ← texto real     │
│     do RSS, sem meta-linguagem          │
├─────────────────────────────────────────┤
│  DESTAQUES DO DIA:                      │
│  • Título 1 (link)                      │
│    Resumo direto abaixo — texto real,   │
│    sem rodeios, sem "este é um resumo"  │
│  • Título 2 (link)                      │
│    Resumo direto abaixo                 │
│  • Título 3 (link)                      │
│    Resumo direto abaixo                 │
│  • Título 4 (link)                      │
│    Resumo direto abaixo                 │
├─────────────────────────────────────────┤
│  [+ Mais notícias do dia (N)] ← fechado │
└─────────────────────────────────────────┘
```

**Regras de seleção das 4 matérias:**
- Selecionadas pela pontuação de interesse (tabela acima)
- Se não houver 4 com interesse, completa com as próximas da lista
- Matéria Principal = item de maior pontuação do feed

**Regras de Resumo:**
- Extraído do corpo real do RSS (`content:encoded`, `content`, `description`)
- Truncado na última frase completa dentro de ~500-600 caracteres
- **Sem meta-linguagem** — sem "Este é um resumo de...", "O artigo aborda...", etc.
- Fonte Georgia, estilo serif, texto justificado (`text-align: justify`)

---

## 6. 📂 Seções e Cadernos

### Aba: CADERNOS TEMÁTICOS
| Seção | Subtitle |
|---|---|
| Sociedade | Comportamento, Direitos & Cotidiano |
| Política | Poder, STF, Congresso & Eleições |
| Economia | Mercado Financeiro, Bolsa & Empresas |
| Tecnologia & IA | Modelos de IA, Chips & Inovação |
| Marketing | Vídeo Digital, GEO & Estratégia B2B |
| Futebol | Colorado em Primeiro Lugar |

### Aba: CANAIS DE NOTÍCIAS
| Seção | Fontes |
|---|---|
| Grandes TVs & Portais Nacionais | G1, Folha, R7, Metrópoles |
| Internacionais em Português | BBC Brasil, DW, CNN Brasil, Investing.com |
| Internacionais Top World | NYT, BBC World, The Guardian, AP |
| Esquerda & Progressistas | Brasil 247, Intercept, DCM, CartaCapital |
| Direita & Conservadores | Jovem Pan, Revista Oeste, O Antagonista, Gazeta do Povo |

**Regras de título:** sem a palavra "Caderno", sem emojis, texto direto.

---

## 7. 🌤️ Barrinha de Clima

- Exibida **logo abaixo do menu de abas**, antes das notícias
- Cidades: Gaivota, Porto Alegre, Florianópolis, Vicente Dutra, Roque Gonzales
- Exibição compacta em linha única: temperatura atual + (máx/mín)
- Dados via Open-Meteo API (gratuita, sem chave)

---

## 8. 🧹 Limpeza de Processos

- O script `gerar_edicao.mjs` roda e encerra sozinho
- Não deixa processos em background
- O servidor HTTP (`python -m http.server 3000`) é separado e pode ficar rodando
