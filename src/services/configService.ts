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
    this.configPath = path.join(process.cwd(), 'data', 'store_config.json');

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[ConfigService] Erro ao ler arquivo de configuração:', err);
    }

    // Padrão zerado / configurável via .env ou Painel Web
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

    // Atualiza também as variáveis de ambiente em memória
    if (newConfig.shopifyShopDomain) process.env.SHOPIFY_SHOP_DOMAIN = newConfig.shopifyShopDomain;
    if (newConfig.shopifyAccessToken) process.env.SHOPIFY_ACCESS_TOKEN = newConfig.shopifyAccessToken;
    if (newConfig.botConversaApiKey) process.env.BOTCONVERSA_API_KEY = newConfig.botConversaApiKey;

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      console.log('[ConfigService] Configurações da Shopify e Loja atualizadas com sucesso!');
    } catch (err) {
      console.error('[ConfigService] Erro ao salvar configurações:', err);
    }

    return this.getConfig();
  }
}
