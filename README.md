# 🤖 Agente de IA Comercial para WhatsApp (BotConversa) + Shopify

Este projeto é um **Agente Comercial de Inteligência Artificial** desenvolvido para atuar como vendedor especialista no nicho de móveis e decoração no WhatsApp. Ele se conecta via **Webhook com o BotConversa** e realiza consultas em tempo real na **API da Shopify**, apresentando produtos, tirando dúvidas de medidas/materiais, contornando objeções de venda e aprendendo continuamente com as conversas.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js & TypeScript**: Servidor backend rápido e assíncrono.
- **Express.js**: Gestão de rotas e webhooks.
- **Google Gemini API**: Inteligência artificial para raciocínio comercial, linguagem natural e persuasão em vendas.
- **Shopify GraphQL / REST API**: Consulta em tempo real do catálogo de móveis, variações de cor/tamanho, estoque e geração de links de checkout.
- **BotConversa API**: Recepção de webhooks de mensagens e envio de respostas, imagens de produtos e etiquetamento (tags) no WhatsApp.
- **Continuous Learning RAG Store**: Base de conhecimento inicial + sistema de memória persistente para aprendizado contínuo.

---

## 📁 Estrutura do Projeto

```
whatsapp-shopify-ai-agent/
├── config/
│   └── furniture_seller_config.json   # Configuração inicial (Persona, Objeções, Políticas, FAQs)
├── data/
│   ├── knowledge_memory.json           # Memória de conhecimento acumulada (RAG)
│   └── conversation_logs.json          # Histórico de conversas do WhatsApp
├── src/
│   ├── agent/
│   │   ├── learningStore.ts            # Motor de aprendizado contínuo e RAG
│   │   └── salesAgent.ts               # Núcleo do Agente de Vendas (Gemini + Shopify Tools)
│   ├── services/
│   │   ├── botconversaService.ts       # Envio de mensagens, imagens e tags via BotConversa API
│   │   └── shopifyService.ts           # Consulta ao catálogo da Shopify
│   ├── types/
│   │   └── index.ts                    # Interfaces de dados TypeScript
│   ├── test/
│   │   └── agent.test.ts               # Teste de simulação do fluxo de vendas
│   └── server.ts                       # Servidor Express e endpoint de Webhook
├── .env.example                        # Template de variáveis de ambiente
├── package.json
└── tsconfig.json
```

---

## ⚙️ Como Configurar

### 1. Instalar as Dependências

No terminal da pasta do projeto, execute:
```bash
npm install
```

### 2. Configurar o Arquivo `.env`

Copie o arquivo `.env.example` para `.env` e preencha suas chaves:
```bash
cp .env.example .env
```

Campos a preencher:
- `GEMINI_API_KEY`: Sua chave da API do Google Gemini.
- `SHOPIFY_SHOP_DOMAIN`: Domínio da sua loja (ex: `sua-loja-moveis.myshopify.com`).
- `SHOPIFY_ACCESS_TOKEN`: Token de Acesso da API de Admin/Storefront da Shopify.
- `BOTCONVERSA_API_KEY`: Token de API gerado na sua conta do BotConversa (*Configurações > API*).

---

## 🔗 Como Conectar com o BotConversa

1. **Expor o servidor (Local/Servidor)**:
   - Para rodar localmente e testar no WhatsApp, utilize o [ngrok](https://ngrok.com/):
     ```bash
     ngrok http 3000
     ```
   - Você receberá uma URL pública como: `https://xxxx.ngrok-free.app`

2. **Configurar o Webhook no BotConversa**:
   - Vá no seu painel do **BotConversa** em **Automações** ou **Fluxos**.
   - No fluxo de atendimento inicial (ou quando o lead solicitar atendimento comercial), adicione um bloco de **Webhook (POST)**.
   - Coloque a URL: `https://xxxx.ngrok-free.app/api/webhook/botconversa`
   - O BotConversa passará os dados do assinante (`subscriber.id`, `subscriber.phone`, `text`) para a IA.
   - O servidor responde `200 OK` instantaneamente e envia a resposta de vendas direto para o WhatsApp do cliente através da API do BotConversa!

---

## 🧠 Aprendizado Contínuo (Continuous Learning)

### 1. Configuração Inicial
O arquivo [`config/furniture_seller_config.json`](file:///C:/Users/lusca/.gemini/antigravity/scratch/whatsapp-shopify-ai-agent/config/furniture_seller_config.json) é onde você insere todas as regras essenciais da sua loja de móveis (políticas de frete, garantias, tipos de tecido, formas de pagamento e gatilhos de vendas).

### 2. Aprendizado em Tempo Real com Conversas
Todas as mensagens trocadas com clientes ficam registradas em `data/conversation_logs.json`.

### 3. Ensinar Novos Conhecimentos via API Admin
Você ou sua equipe podem enviar novas respostas ou correções para o robô a qualquer momento usando a rota:
```http
POST /api/learning/ingest
Content-Type: application/json

{
  "category": "objection",
  "topic": "tecido impermeável pet friendly",
  "resolution": "Trabalhamos com o tecido Aquablock e Linho Sintético especial de alta densidade que resiste a arranhões de pets."
}
```

---

## 🚀 Como Executar e Testar

### Rodar em Desenvolvimento:
```bash
npm run dev
```

### Rodar o Teste Automatizado de Vendas:
```bash
npx ts-node src/test/agent.test.ts
```
