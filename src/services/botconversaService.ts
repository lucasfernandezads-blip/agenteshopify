import axios from 'axios';
import { ConfigService } from './configService';

export class BotConversaService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  private getCredentials() {
    const config = this.configService.getConfig();
    return {
      apiKey: config.botConversaApiKey || process.env.BOTCONVERSA_API_KEY || '',
      apiUrl: config.botConversaApiUrl || process.env.BOTCONVERSA_API_URL || 'https://backend.botconversa.com.br/api/v1/webhook'
    };
  }

  public isConfigured(): boolean {
    const { apiKey } = this.getCredentials();
    return Boolean(apiKey && !apiKey.includes('exemplo'));
  }

  /**
   * Envia uma mensagem de texto de volta ao cliente no WhatsApp via API do BotConversa
   */
  async sendMessage(subscriberId: string, message: string): Promise<boolean> {
    const { apiKey, apiUrl } = this.getCredentials();

    if (!this.isConfigured()) {
      console.log(`[BotConversaService SIMULAÇÃO] (Sem Chave API configurada). Enviar mensagem para (${subscriberId}):\n"${message}"`);
      return true;
    }

    try {
      const endpoint = `${apiUrl}/subscriber/${subscriberId}/send_message/`;
      const response = await axios.post(
        endpoint,
        {
          type: 'text',
          value: message
        },
        {
          headers: {
            'API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`[BotConversaService] Mensagem enviada via API BotConversa para ${subscriberId}. Status:`, response.status);
      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      console.error(`[BotConversaService] Erro ao enviar mensagem para ${subscriberId}:`, error?.response?.data || error.message);
      return false;
    }
  }

  /**
   * Envia imagem de produto para o cliente no WhatsApp
   */
  async sendPhoto(subscriberId: string, imageUrl: string, caption?: string): Promise<boolean> {
    const { apiKey, apiUrl } = this.getCredentials();

    if (!this.isConfigured()) {
      console.log(`[BotConversaService SIMULAÇÃO] Enviar Imagem (${imageUrl}) para ${subscriberId}`);
      return true;
    }

    try {
      const endpoint = `${apiUrl}/subscriber/${subscriberId}/send_message/`;
      const response = await axios.post(
        endpoint,
        {
          type: 'image',
          value: imageUrl,
          caption: caption || ''
        },
        {
          headers: {
            'API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      console.error(`[BotConversaService] Erro ao enviar imagem para ${subscriberId}:`, error?.response?.data || error.message);
      return false;
    }
  }

  /**
   * Adiciona Tag no perfil do cliente no BotConversa
   */
  async addSubscriberTag(subscriberId: string, tagName: string): Promise<boolean> {
    const { apiKey, apiUrl } = this.getCredentials();

    if (!this.isConfigured()) {
      console.log(`[BotConversaService SIMULAÇÃO] Tag "${tagName}" adicionada ao assinante ${subscriberId}`);
      return true;
    }

    try {
      const endpoint = `${apiUrl}/subscriber/${subscriberId}/tags/`;
      const response = await axios.post(
        endpoint,
        { name: tagName },
        {
          headers: {
            'API-KEY': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      console.error(`[BotConversaService] Erro ao adicionar tag no BotConversa:`, error?.response?.data || error.message);
      return false;
    }
  }
}
