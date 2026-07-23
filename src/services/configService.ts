import fs from 'fs';
import path from 'path';

export interface AppConfig {
  storeName: string;
  agentName: string;
  shopifyShopDomain: string;
  shopifyAccessToken: string;
  shopifyApiVersion: string;
  botConversaApiKey: string;
  botConversaApiUrl: string;
  currency: string;
}

export class ConfigService {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    // Em ambientes serverless (Vercel), usaremos a pasta /tmp se data não for gravável
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');

    if (!isVercel && !fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('[ConfigService] Usando diretório temporário para armazenamento.');
      }
    }

    this.configPath = path.join(dataDir, 'store_config.json');
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[ConfigService] Carregando a partir de Variáveis de Ambiente da Vercel / .env');
    }

    return {
      storeName: process.env.STORE_NAME || 'Minha Loja de Móveis',
      agentName: process.env.AGENT_NAME || 'Lucas - Consultor de Vendas',
      shopifyShopDomain: process.env.SHOPIFY_SHOP_DOMAIN || '',
      shopifyAccessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
      shopifyApiVersion: process.env.SHOPIFY_API_VERSION || '2024-07',
      botConversaApiKey: process.env.BOTCONVERSA_API_KEY || '',
      botConversaApiUrl: process.env.BOTCONVERSA_API_URL || 'https://backend.botconversa.com.br/api/v1/webhook',
      currency: 'BRL'
    };
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AppConfig>): AppConfig {
    this.config = {
      ...this.config,
      ...newConfig
    };

    if (newConfig.shopifyShopDomain) process.env.SHOPIFY_SHOP_DOMAIN = newConfig.shopifyShopDomain;
    if (newConfig.shopifyAccessToken) process.env.SHOPIFY_ACCESS_TOKEN = newConfig.shopifyAccessToken;
    if (newConfig.botConversaApiKey) process.env.BOTCONVERSA_API_KEY = newConfig.botConversaApiKey;

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[ConfigService] Vercel Serverless: Configurações mantidas em memória para esta execução.');
    }

    return this.getConfig();
  }
}
