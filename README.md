# 🤖 Agente de IA Comercial para WhatsApp (BotConversa) + Shopify

Este projeto é um **Agente Comercial de Inteligência Artificial** para vendas de móveis e decoração no WhatsApp. Ele se conecta via **Webhook com o BotConversa** e realiza consultas em tempo real na **API da Shopify**, apresentando produtos, tirando dúvidas de medidas/materiais, contornando objeções de venda e aprendendo continuamente com as conversas.

A aplicação conta com um **Painel de Controle Web Completo** e está **100% otimizada para ser publicada online via GitHub e Vercel**!

---

## ⚡ Guia Rápido: Como Publicar no GitHub e Vercel (Passo a Passo)

### 1. Subir o Projeto para o GitHub

No terminal dentro desta pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Initial commit - Agente IA WhatsApp Shopify"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

---

### 2. Implantar na Vercel (1-Clique)

1. Acesse **[Vercel.com](https://vercel.com)** e faça login com sua conta do GitHub.
2. Clique no botão **"Add New..." > "Project"**.
3. Selecione o repositório do seu GitHub (`SEU_REPOSITORIO`).
4. A Vercel detectará automaticamente o arquivo `vercel.json` e a pasta `api/`!
5. **Configurar Variáveis de Ambiente na Vercel**:
   - Vá na seção **Environment Variables** e insira as variáveis:
     - `GEMINI_API_KEY`: Sua chave da API do Google Gemini.
     - `SHOPIFY_SHOP_DOMAIN`: Seu domínio `sua-loja.myshopify.com`.
     - `SHOPIFY_ACCESS_TOKEN`: Token `shpat_xxxxxxxx`.
     - `BOTCONVERSA_API_KEY`: Token de API do BotConversa.
6. Clique em **Deploy**!

Sua aplicação estará no ar em poucos segundos em um domínio HTTPS oficial como:
`https://meu-agente-ia.vercel.app`

---

### 3. Conectar a Vercel com o BotConversa

1. No seu painel da Vercel, copie a URL do seu aplicativo: `https://meu-agente-ia.vercel.app`
2. No **BotConversa**, vá na sua Automação/Fluxo e crie um bloco de **Webhook (POST)**.
3. Coloque a URL:
   ```
   https://meu-agente-ia.vercel.app/api/webhook/botconversa
   ```
4. Pronto! Todas as mensagens recebidas pelo seu número no BotConversa serão respondidas automaticamente pelo Agente de IA!

---

## 💻 Estrutura Otimizada para Vercel Serverless

```
whatsapp-shopify-ai-agent/
├── api/
│   └── index.ts                        # Entrypoint das Vercel Serverless Functions
├── public/                             # Frontend Painel Web (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── agent/
│   │   ├── learningStore.ts            # Memória RAG Serverless
│   │   └── salesAgent.ts               # Núcleo de Vendas com Gemini + Shopify
│   ├── services/
│   │   ├── configService.ts            # Gerenciador de Credenciais Multiloja
│   │   ├── botconversaService.ts       # Envio WhatsApp & Tags
│   │   └── shopifyService.ts           # Consulta Catálogo GraphQL
│   └── server.ts                       # Servidor local Express
├── vercel.json                         # Configuração de Roteamento da Vercel
├── package.json
└── README.md
```

---

## 🧪 Rodar Localmente antes de Enviar ao GitHub

```bash
npm install
npm run dev
```

Acesse no navegador: **`http://localhost:3000`**
