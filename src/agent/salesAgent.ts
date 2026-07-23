import { GoogleGenAI } from '@google/genai';
import { ShopifyService } from '../services/shopifyService';
import { BotConversaService } from '../services/botconversaService';
import { LearningStore } from './learningStore';

export class SalesAgent {
  private ai: GoogleGenAI | null = null;
  private shopifyService: ShopifyService;
  private botConversaService: BotConversaService;
  private learningStore: LearningStore;
  private modelName: string = 'gemini-2.5-flash';

  constructor(shopifyService: ShopifyService, botConversaService: BotConversaService, learningStore: LearningStore) {
    this.shopifyService = shopifyService;
    this.botConversaService = botConversaService;
    this.learningStore = learningStore;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'sua_chave_gemini_api_aqui') {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.error('[SalesAgent] Erro ao inicializar SDK do Gemini:', err);
      }
    } else {
      console.warn('[SalesAgent] GEMINI_API_KEY não configurada. O agente funcionará com respostas inteligentes orientadas por regras e busca na Shopify.');
    }
  }

  /**
   * Processa a mensagem enviada pelo cliente no WhatsApp
   */
  async processCustomerMessage(subscriberId: string, customerPhone: string | undefined, customerName: string | undefined, messageText: string): Promise<string> {
    console.log(`[SalesAgent] Processando mensagem de ${customerName || subscriberId}: "${messageText}"`);

    // 1. Busca produtos relevantes no catálogo da Shopify
    const shopifyProducts = await this.shopifyService.searchProducts(messageText, 3);
    
    // 2. Busca conhecimento relevante e políticas na base de aprendizado RAG
    const knowledgeContext = this.learningStore.getRelevantKnowledge(messageText);

    // 3. Obtém dados de configuração da loja
    const storeConfig = this.learningStore.getStoreConfig();
    const agentName = storeConfig.agent_name || 'Lucas - Consultor de Móveis';
    const storeName = storeConfig.store_name || 'Móveis & Decoração Design';

    // 4. Monta o Prompt de Sistema com Persona de Vendedor de Móveis
    const systemPrompt = `
Você é ${agentName}, vendedor consultivo de elite da loja de móveis "${storeName}".
Sua meta é atender o cliente no WhatsApp com excelência, apresentar móveis ideais do catálogo da Shopify, tirar todas as dúvidas técnicas (medidas, tecidos, madeira, montagem, prazos), contornar objeções de venda (preço, frete, receio de comprar móvel online) e sugerir produtos complementares (ex: se comprar mesa de jantar, sugerir cadeiras ou buffet).

Siga rigorosamente estas diretrizes no WhatsApp:
- Seja extremamente cordial, profissional e persuasivo.
- Trate o cliente pelo nome caso fornecido (${customerName || 'Cliente'}).
- Use formatação clara do WhatsApp: use *negrito* para destacar nomes de produtos, preços e ofertas.
- Mantenha respostas com parágrafos curtos e fáceis de ler no celular.
- Sempre faça uma pergunta de fechamento ou continuidade ao final (ex: "Quantos metros tem a sua sala para eu conferir se fica perfeito?", "Prefere pagamento à vista no PIX com 10% de desconto ou parcelado no cartão?").

PRODUTOS ENCONTRADOS NO CATÁLOGO SHOPIFY RELEVANTES PARA A MENSAGEM:
${JSON.stringify(shopifyProducts, null, 2)}

INFORMAÇÕES DE REGRAS DE NEGÓCIO E BASE DE APRENDIZADO RELEVANTE:
${knowledgeContext}

MENSAGEM DO CLIENTE:
"${messageText}"
`;

    let responseText = '';

    // 5. Executa a IA (Gemini API) ou Fallback com motor de vendas inteligente
    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: systemPrompt,
        });

        responseText = response.text || '';
      } catch (error: any) {
        console.error('[SalesAgent] Erro na chamada do Gemini API:', error.message);
        responseText = this.generateRuleBasedFallback(customerName, messageText, shopifyProducts, storeConfig);
      }
    } else {
      responseText = this.generateRuleBasedFallback(customerName, messageText, shopifyProducts, storeConfig);
    }

    // 6. Verifica sinais de intenção de compra ou objeção para etiquetar no BotConversa
    this.handleTaggingSignals(subscriberId, messageText);

    // 7. Registra a conversa na memória de aprendizado continuo do agente
    this.learningStore.logConversation(subscriberId, customerPhone, messageText, responseText);

    // 8. Envia foto do primeiro produto relevante se houver imagem destacada
    if (shopifyProducts.length > 0 && shopifyProducts[0].featuredImage?.url) {
      await this.botConversaService.sendPhoto(
        subscriberId,
        shopifyProducts[0].featuredImage.url,
        `📸 *${shopifyProducts[0].title}* - A partir de R$ ${shopifyProducts[0].priceRange.minVariantPrice.amount}`
      );
    }

    return responseText;
  }

  /**
   * Trata intenções e aplica tags automaticamente no BotConversa
   */
  private async handleTaggingSignals(subscriberId: string, message: string): Promise<void> {
    const msgLower = message.toLowerCase();

    if (msgLower.includes('sofa') || msgLower.includes('sofá') || msgLower.includes('retrátil')) {
      await this.botConversaService.addSubscriberTag(subscriberId, 'interesse_sofa');
    }
    if (msgLower.includes('mesa') || msgLower.includes('cadeira') || msgLower.includes('jantar')) {
      await this.botConversaService.addSubscriberTag(subscriberId, 'interesse_sala_jantar');
    }
    if (msgLower.includes('desconto') || msgLower.includes('caro') || msgLower.includes('cupom')) {
      await this.botConversaService.addSubscriberTag(subscriberId, 'objecao_preco');
    }
    if (msgLower.includes('comprar') || msgLower.includes('pix') || msgLower.includes('link') || msgLower.includes('fechar')) {
      await this.botConversaService.addSubscriberTag(subscriberId, 'lead_quente_checkout');
    }
  }

  /**
   * Resposta de fallback comercial de alta conversão para simulações e caso a API não responda
   */
  private generateRuleBasedFallback(customerName: string | undefined, message: string, products: any[], storeConfig: any): string {
    const greeting = customerName ? `Olá, *${customerName}*! Tudo bem?` : 'Olá! Tudo bem?';
    
    if (products.length === 0) {
      return `${greeting} Sou o Lucas, consultor especialista aqui da *${storeConfig.store_name || 'Móveis & Decoração'}*.

Percebi que você busca opções incríveis para a sua casa! Para que eu possa selecionar os melhores modelos em nosso catálogo, qual ambiente você está renovando no momento (sala de estar, sala de jantar ou quarto)?

Se preferir, me conte quais as medidas do seu espaço que te indico os modelos ideais! 😊`;
    }

    const firstProd = products[0];
    const priceFormatted = `R$ ${firstProd.priceRange.minVariantPrice.amount}`;
    const checkoutLink = this.shopifyService.generateCheckoutLink(firstProd.variants[0]?.id || '101');

    return `${greeting} Sou o Lucas, seu consultor de móveis! 🛋️

Destaquei para você o nosso incrível *${firstProd.title}*!

✨ *Destaques do Produto*:
• ${firstProd.description}
• *Valor*: A partir de *${priceFormatted}* (com *10% OFF no PIX* ou em até 12x no cartão!)
• *Garantia*: 12 meses direto de fábrica.

🛒 *Link Direto de Compra na Shopify*:
${checkoutLink}

Gostaria de conferir as opções de tecidos/cores ou prefere ver como fica as medidas na sua sala?`;
  }
}
