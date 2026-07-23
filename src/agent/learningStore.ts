import fs from 'fs';
import path from 'path';
import { KnowledgeEntry, ConversationLog } from '../types';

export class LearningStore {
  private configFilePath: string;
  private memoryFilePath: string;
  private logsFilePath: string;
  private configData: any;
  private memoryEntries: KnowledgeEntry[] = [];
  private conversationLogs: ConversationLog[] = [];

  constructor() {
    this.configFilePath = path.join(process.cwd(), 'config', 'furniture_seller_config.json');
    const dataDir = path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.memoryFilePath = path.join(dataDir, 'knowledge_memory.json');
    this.logsFilePath = path.join(dataDir, 'conversation_logs.json');

    this.loadInitialConfig();
    this.loadPersistedMemory();
    this.loadConversationLogs();
  }

  private loadInitialConfig(): void {
    try {
      if (fs.existsSync(this.configFilePath)) {
        const raw = fs.readFileSync(this.configFilePath, 'utf-8');
        this.configData = JSON.parse(raw);
      } else {
        this.configData = {};
      }
    } catch (err) {
      console.error('[LearningStore] Erro ao carregar configurações iniciais:', err);
      this.configData = {};
    }
  }

  private loadPersistedMemory(): void {
    try {
      if (fs.existsSync(this.memoryFilePath)) {
        const raw = fs.readFileSync(this.memoryFilePath, 'utf-8');
        this.memoryEntries = JSON.parse(raw);
      } else {
        // Carrega FAQs e Objeções iniciais do arquivo de configuração para a memória
        this.memoryEntries = [];
        if (this.configData.initial_faqs) {
          for (const faq of this.configData.initial_faqs) {
            this.memoryEntries.push({
              id: `faq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              category: 'faq',
              question_or_topic: faq.question,
              answer_or_resolution: faq.answer,
              source: 'config',
              createdAt: new Date().toISOString()
            });
          }
        }
        if (this.configData.objection_handling) {
          for (const obj of this.configData.objection_handling) {
            this.memoryEntries.push({
              id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              category: 'objection',
              question_or_topic: obj.objection,
              answer_or_resolution: obj.strategy,
              source: 'config',
              createdAt: new Date().toISOString()
            });
          }
        }
        this.saveMemory();
      }
    } catch (err) {
      console.error('[LearningStore] Erro ao carregar memória persistida:', err);
      this.memoryEntries = [];
    }
  }

  private loadConversationLogs(): void {
    try {
      if (fs.existsSync(this.logsFilePath)) {
        const raw = fs.readFileSync(this.logsFilePath, 'utf-8');
        this.conversationLogs = JSON.parse(raw);
      } else {
        this.conversationLogs = [];
      }
    } catch (err) {
      console.error('[LearningStore] Erro ao carregar logs de conversa:', err);
      this.conversationLogs = [];
    }
  }

  private saveMemory(): void {
    try {
      fs.writeFileSync(this.memoryFilePath, JSON.stringify(this.memoryEntries, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LearningStore] Erro ao salvar memória:', err);
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logsFilePath, JSON.stringify(this.conversationLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LearningStore] Erro ao salvar logs de conversa:', err);
    }
  }

  public getStoreConfig(): any {
    return this.configData;
  }

  /**
   * Busca itens relevantes na memória de conhecimento (FAQs, Objeções e Aprendizados anteriores)
   */
  public getRelevantKnowledge(userMessage: string): string {
    const messageLower = userMessage.toLowerCase();
    const matches: string[] = [];

    // Adiciona diretrizes e políticas principais
    if (this.configData.store_policies) {
      const p = this.configData.store_policies;
      matches.push(`[POLÍTICA DE PAGAMENTO]: ${p.payment_methods}`);
      matches.push(`[GARANTIA]: ${p.warranty}`);
      matches.push(`[FRETE]: ${p.shipping_info}`);
    }

    // Filtra entradas de memória que combinam com palavras-chave da mensagem
    for (const entry of this.memoryEntries) {
      const topicLower = entry.question_or_topic.toLowerCase();
      const answerLower = entry.answer_or_resolution.toLowerCase();
      
      const keywords = topicLower.split(' ').filter(w => w.length > 3);
      const isRelevant = keywords.some(k => messageLower.includes(k)) || messageLower.includes(topicLower);

      if (isRelevant) {
        matches.push(`[DICA APRENDIDA - ${entry.category.toUpperCase()}]: ${entry.question_or_topic} -> Resposta/Estratégia: ${entry.answer_or_resolution}`);
      }
    }

    return matches.join('\n');
  }

  /**
   * Registra uma nova conversa no histórico para auditoria e aprendizado contínuo
   */
  public logConversation(subscriberId: string, phone: string | undefined, message: string, response: string, unhandledObjection: boolean = false): void {
    const log: ConversationLog = {
      id: `log_${Date.now()}`,
      subscriberId,
      subscriberPhone: phone,
      customerMessage: message,
      agentResponse: response,
      timestamp: new Date().toISOString(),
      unhandledObjection
    };

    this.conversationLogs.push(log);
    // Mantém no máximo 1000 logs no arquivo JSON local
    if (this.conversationLogs.length > 1000) {
      this.conversationLogs.shift();
    }
    this.saveLogs();
  }

  /**
   * Permite ensinar novos conhecimentos, respostas de objeções ou correções para o robô
   */
  public ingestNewKnowledge(category: 'faq' | 'objection' | 'learned_conversation' | 'product_note', topic: string, resolution: string, source: 'user_feedback' | 'chat_learning' = 'user_feedback'): KnowledgeEntry {
    const newEntry: KnowledgeEntry = {
      id: `learned_${Date.now()}`,
      category,
      question_or_topic: topic,
      answer_or_resolution: resolution,
      source,
      createdAt: new Date().toISOString()
    };

    this.memoryEntries.push(newEntry);
    this.saveMemory();
    console.log(`[LearningStore] Novo conhecimento ingerido com sucesso: "${topic}"`);
    return newEntry;
  }

  /**
   * Retorna todas as conversas registradas
   */
  public getLogs(): ConversationLog[] {
    return this.conversationLogs;
  }

  /**
   * Retorna toda a base de conhecimento aprendida
   */
  public getAllKnowledge(): KnowledgeEntry[] {
    return this.memoryEntries;
  }
}
