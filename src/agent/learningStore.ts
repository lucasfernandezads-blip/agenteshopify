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
    
    const isVercel = Boolean(process.env.VERCEL);
    const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');

    if (!isVercel && !fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('[LearningStore] Usando armazenamento temporário.');
      }
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
      this.configData = {};
    }
  }

  private loadPersistedMemory(): void {
    try {
      if (fs.existsSync(this.memoryFilePath)) {
        const raw = fs.readFileSync(this.memoryFilePath, 'utf-8');
        this.memoryEntries = JSON.parse(raw);
        return;
      }
    } catch (err) {
      console.warn('[LearningStore] Inicializando memória a partir de configurações padrão.');
    }

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

  private loadConversationLogs(): void {
    try {
      if (fs.existsSync(this.logsFilePath)) {
        const raw = fs.readFileSync(this.logsFilePath, 'utf-8');
        this.conversationLogs = JSON.parse(raw);
      } else {
        this.conversationLogs = [];
      }
    } catch (err) {
      this.conversationLogs = [];
    }
  }

  private saveMemory(): void {
    try {
      fs.writeFileSync(this.memoryFilePath, JSON.stringify(this.memoryEntries, null, 2), 'utf-8');
    } catch (err) {
      // Gravação silenciosa em Vercel
    }
  }

  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logsFilePath, JSON.stringify(this.conversationLogs, null, 2), 'utf-8');
    } catch (err) {
      // Gravação silenciosa em Vercel
    }
  }

  public getStoreConfig(): any {
    return this.configData;
  }

  public getRelevantKnowledge(userMessage: string): string {
    const messageLower = userMessage.toLowerCase();
    const matches: string[] = [];

    if (this.configData.store_policies) {
      const p = this.configData.store_policies;
      matches.push(`[POLÍTICA DE PAGAMENTO]: ${p.payment_methods}`);
      matches.push(`[GARANTIA]: ${p.warranty}`);
      matches.push(`[FRETE]: ${p.shipping_info}`);
    }

    for (const entry of this.memoryEntries) {
      const topicLower = entry.question_or_topic.toLowerCase();
      const keywords = topicLower.split(' ').filter(w => w.length > 3);
      const isRelevant = keywords.some(k => messageLower.includes(k)) || messageLower.includes(topicLower);

      if (isRelevant) {
        matches.push(`[DICA APRENDIDA - ${entry.category.toUpperCase()}]: ${entry.question_or_topic} -> Resposta/Estratégia: ${entry.answer_or_resolution}`);
      }
    }

    return matches.join('\n');
  }

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
    if (this.conversationLogs.length > 500) {
      this.conversationLogs.shift();
    }
    this.saveLogs();
  }

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
    return newEntry;
  }

  public getLogs(): ConversationLog[] {
    return this.conversationLogs;
  }

  public getAllKnowledge(): KnowledgeEntry[] {
    return this.memoryEntries;
  }
}
