import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ConfigService } from './services/configService';
import { ShopifyService } from './services/shopifyService';
import { BotConversaService } from './services/botconversaService';
import { LearningStore } from './agent/learningStore';
import { SalesAgent } from './agent/salesAgent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve arquivos estáticos do painel web online
app.use(express.static(path.join(process.cwd(), 'public')));

const PORT = process.env.PORT || 3000;

// Inicializa o serviço de configurações dinâmicas da loja
const configService = new ConfigService();
const shopifyService = new ShopifyService(configService);
const botConversaService = new BotConversaService(configService);
const learningStore = new LearningStore();
const salesAgent = new SalesAgent(shopifyService, botConversaService, learningStore);

/**
 * Healthcheck da API e status de conexão com Shopify
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'Agente Comercial de IA WhatsApp (BotConversa) + Shopify',
    shopifyConfigured: shopifyService.isConfigured(),
    botConversaConfigured: botConversaService.isConfigured(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Endpoint para obter as configurações atuais da Shopify e da Loja
 */
app.get('/api/config', (req: Request, res: Response) => {
  const cfg = configService.getConfig();
  // Mascara tokens por segurança na exibição no frontend
  res.json({
    storeName: cfg.storeName,
    agentName: cfg.agentName,
    shopifyShopDomain: cfg.shopifyShopDomain,
    shopifyAccessTokenConfigured: Boolean(cfg.shopifyAccessToken),
    shopifyApiVersion: cfg.shopifyApiVersion,
    botConversaApiKeyConfigured: Boolean(cfg.botConversaApiKey),
    botConversaApiUrl: cfg.botConversaApiUrl,
    currency: cfg.currency
  });
});

/**
 * Endpoint para salvar/atualizar as credenciais da Shopify e da Loja via Painel Web
 */
app.post('/api/config', (req: Request, res: Response) => {
  try {
    const {
      storeName,
      agentName,
      shopifyShopDomain,
      shopifyAccessToken,
      shopifyApiVersion,
      botConversaApiKey,
      botConversaApiUrl
    } = req.body;

    const updated = configService.updateConfig({
      ...(storeName && { storeName }),
      ...(agentName && { agentName }),
      ...(shopifyShopDomain !== undefined && { shopifyShopDomain }),
      ...(shopifyAccessToken !== undefined && shopifyAccessToken !== '' && { shopifyAccessToken }),
      ...(shopifyApiVersion && { shopifyApiVersion }),
      ...(botConversaApiKey !== undefined && botConversaApiKey !== '' && { botConversaApiKey }),
      ...(botConversaApiUrl && { botConversaApiUrl })
    });

    return res.json({
      message: 'Configurações da Shopify e BotConversa salvas com sucesso!',
      shopifyConfigured: shopifyService.isConfigured(),
      botConversaConfigured: botConversaService.isConfigured(),
      config: {
        storeName: updated.storeName,
        agentName: updated.agentName,
        shopifyShopDomain: updated.shopifyShopDomain
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Endpoint Webhook principal chamado pelo BotConversa quando o cliente envia mensagem no WhatsApp
 */
app.post('/api/webhook/botconversa', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[Webhook BotConversa] Payload recebido:', JSON.stringify(payload, null, 2));

    const subscriberId = payload.subscriber?.id || payload.subscriber_id;
    const phone = payload.subscriber?.phone || payload.phone;
    const name = payload.subscriber?.first_name 
      ? `${payload.subscriber.first_name} ${payload.subscriber.last_name || ''}`.trim() 
      : undefined;

    const messageText = payload.message?.text || payload.text;

    if (!subscriberId || !messageText) {
      console.warn('[Webhook BotConversa] Payload sem subscriber.id ou mensagem de texto válida.');
      return res.status(400).json({ error: 'subscriber.id e message.text são obrigatórios' });
    }

    // 1. Responde 200 OK imediatamente para evitar estourar o timeout do Webhook no BotConversa
    res.status(200).json({ status: 'received', subscriberId });

    // 2. Processa o Agente de IA em background de forma assíncrona
    setImmediate(async () => {
      try {
        const agentResponse = await salesAgent.processCustomerMessage(
          String(subscriberId),
          phone,
          name,
          messageText
        );

        // 3. Envia a resposta final para o WhatsApp via API do BotConversa
        await botConversaService.sendMessage(String(subscriberId), agentResponse);
      } catch (agentErr: any) {
        console.error('[Webhook BotConversa] Erro durante o processamento do agente assíncrono:', agentErr);
      }
    });

  } catch (error: any) {
    console.error('[Webhook BotConversa] Erro no endpoint do webhook:', error.message);
    return res.status(500).json({ error: 'Erro interno no servidor de webhook' });
  }
});

/**
 * Rota para simulação em tempo real direto do Painel Web
 */
app.post('/api/simulate', async (req: Request, res: Response) => {
  try {
    const { subscriber_id, text, name } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Texto da mensagem é obrigatório' });
    }

    const subId = subscriber_id || 'sim_user_1';
    const agentResponse = await salesAgent.processCustomerMessage(
      subId,
      '5511999999999',
      name || 'Cliente Teste',
      text
    );

    const products = await shopifyService.searchProducts(text, 1);
    const photo = products.length > 0 ? products[0].featuredImage?.url : null;

    return res.json({
      status: 'success',
      response: agentResponse,
      photo: photo
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Rota para adicionar novos conhecimentos/ensinar o robô manualmente (Admin Feedback Loop)
 */
app.post('/api/learning/ingest', (req: Request, res: Response) => {
  try {
    const { category, topic, resolution } = req.body;
    if (!topic || !resolution) {
      return res.status(400).json({ error: 'topic e resolution são obrigatórios' });
    }

    const entry = learningStore.ingestNewKnowledge(
      category || 'faq',
      topic,
      resolution,
      'user_feedback'
    );

    return res.json({ message: 'Conhecimento adicionado com sucesso', entry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Consulta a base de conhecimento aprendida pelo agente
 */
app.get('/api/learning/knowledge', (req: Request, res: Response) => {
  res.json({
    knowledge: learningStore.getAllKnowledge()
  });
});

/**
 * Consulta os logs de conversas realizadas no WhatsApp
 */
app.get('/api/learning/logs', (req: Request, res: Response) => {
  res.json({
    logs: learningStore.getLogs()
  });
});

// Fallback para SPA / index.html
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Painel do Agente de IA Comercial Rodando na porta ${PORT}`);
  console.log(`🌐 Acesse o aplicativo em: http://localhost:${PORT}`);
  console.log(`📍 Webhook do BotConversa: http://localhost:${PORT}/api/webhook/botconversa`);
  console.log(`=======================================================`);
});
