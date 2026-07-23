import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { ConfigService } from '../src/services/configService';
import { ShopifyService } from '../src/services/shopifyService';
import { BotConversaService } from '../src/services/botconversaService';
import { LearningStore } from '../src/agent/learningStore';
import { SalesAgent } from '../src/agent/salesAgent';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const configService = new ConfigService();
const shopifyService = new ShopifyService(configService);
const botConversaService = new BotConversaService(configService);
const learningStore = new LearningStore();
const salesAgent = new SalesAgent(shopifyService, botConversaService, learningStore);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'Vercel Serverless',
    system: 'Agente Comercial de IA WhatsApp (BotConversa) + Shopify',
    shopifyConfigured: shopifyService.isConfigured(),
    botConversaConfigured: botConversaService.isConfigured(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  const cfg = configService.getConfig();
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
      message: 'Configurações salvas com sucesso no ambiente Serverless Vercel!',
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

app.post('/api/webhook/botconversa', async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    const subscriberId = payload.subscriber?.id || payload.subscriber_id;
    const phone = payload.subscriber?.phone || payload.phone;
    const name = payload.subscriber?.first_name 
      ? `${payload.subscriber.first_name} ${payload.subscriber.last_name || ''}`.trim() 
      : undefined;

    const messageText = payload.message?.text || payload.text;

    if (!subscriberId || !messageText) {
      return res.status(400).json({ error: 'subscriber.id e message.text são obrigatórios' });
    }

    // Processa o agente de IA imediatamente na função Serverless
    const agentResponse = await salesAgent.processCustomerMessage(
      String(subscriberId),
      phone,
      name,
      messageText
    );

    // Envia a resposta de volta ao WhatsApp via API do BotConversa
    await botConversaService.sendMessage(String(subscriberId), agentResponse);

    return res.status(200).json({ status: 'success', subscriberId });

  } catch (error: any) {
    console.error('[Webhook BotConversa Vercel] Erro:', error.message);
    return res.status(500).json({ error: 'Erro interno no servidor de webhook' });
  }
});

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

app.get('/api/learning/knowledge', (req: Request, res: Response) => {
  res.json({
    knowledge: learningStore.getAllKnowledge()
  });
});

app.get('/api/learning/logs', (req: Request, res: Response) => {
  res.json({
    logs: learningStore.getLogs()
  });
});

export default app;
