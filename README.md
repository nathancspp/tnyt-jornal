# 📰 The Neitan York Times (TNYT)

> Jornal diário automatizado de Nathan Medeiros da Costa. Cobre Brasil, Economia & Negócios, Tecnologia & IA, Marketing & Growth, Mundo, Futebol (Internacional-RS) e Clima ao vivo.

---

## ⚡ Como funciona a Automação Diária

O projeto é 100% automatizado e executa todos os dias às **08:00 (horário de Brasília)** via **GitHub Actions**.

### Pipeline:
1. **Coleta de Notícias (RSS)**: Lê as fontes oficiais configuradas em `scripts/gerar_edicao.mjs`.
2. **Clima ao Vivo (Open-Meteo)**: Puxa temperatura, chuva e vento para Balneário Gaivota/SC, Porto Alegre, Florianópolis, Vicente Dutra e Roque Gonzales.
3. **Curadoria Inteligente (Gemini Flash)**: Envia as pautas para o Gemini 2.5 Flash selecionar as melhores manchetes e escrever resumos factuais de 3-4 frases baseados no perfil do Nathan.
4. **Atualização HTML & Histórico**: Preenche a `.frontpage` do `index.html` (preservando todo o CSS e responsividade) e empilha a nova edição em `ARQUIVO.md`.
5. **Auto-Publish**: Commita e publica as alterações no GitHub Pages.

---

## 🔑 Como Configurar o Gemini (Gratuito)

Para ativar a curadoria por IA com custo zero:

1. Gere uma API Key gratuita no [Google AI Studio](https://aistudio.google.com/).
2. Vá no seu repositório no GitHub: **Settings > Secrets and variables > Actions**.
3. Clique em **New repository secret**.
4. Nome: `GEMINI_API_KEY`
5. Valor: Cole sua chave obtida no AI Studio.

---

## 🚀 Como Rodar Manualmente

### No GitHub:
Vá em **Actions > Publicar Edição Diária TNYT > Run workflow**.

### Localmente:
```bash
npm install
npm run gerar
```
