import { ShopifyService } from '../services/shopifyService';
import { BotConversaService } from '../services/botconversaService';
import { LearningStore } from '../agent/learningStore';
import { SalesAgent } from '../agent/salesAgent';

async function runTests() {
  console.log('🧪 Iniciando Teste do Agente Comercial de IA...');

  const shopifyService = new ShopifyService();
  const botConversaService = new BotConversaService();
  const learningStore = new LearningStore();
  const salesAgent = new SalesAgent(shopifyService, botConversaService, learningStore);

  // Teste 1: Busca de Produtos Shopify
  console.log('\n--- TESTE 1: Busca de Móveis na Shopify ---');
  const sofas = await shopifyService.searchProducts('sofá retrátil', 2);
  console.log(`Encontrados ${sofas.length} produtos de sofá:`, sofas.map(s => s.title));

  // Teste 2: Ingestão de Novo Conhecimento (Aprendizado Contínuo)
  console.log('\n--- TESTE 2: Aprendizado Contínuo ---');
  learningStore.ingestNewKnowledge(
    'objection',
    'tecido impermeável pet friendly',
    'Oferecemos a linha de tecidos Aquablock e Linho sintético especial de altíssima gramatura que não desfia com arranhões de gatos/cães.',
    'user_feedback'
  );

  // Teste 3: Processamento de Mensagem do Cliente no WhatsApp
  console.log('\n--- TESTE 3: Atendimento ao Cliente no WhatsApp ---');
  const response = await salesAgent.processCustomerMessage(
    'sub_12345',
    '5511999999999',
    'Mariana',
    'Olá! Quero um sofá retrátil bem confortável para minha sala de estar. Vocês têm opção impermeável para quem tem pet?'
  );

  console.log('\n🤖 RESPOSTA GERADA PELO AGENTE DE IA PARA O WHATSAPP:');
  console.log('--------------------------------------------------');
  console.log(response);
  console.log('--------------------------------------------------');

  // Teste 4: Verificação dos Logs Salvos
  const logs = learningStore.getLogs();
  console.log(`\n✅ ${logs.length} conversa(s) registrada(s) com sucesso nos logs.`);

  console.log('\n✨ Todos os testes executados com sucesso!');
}

runTests().catch(err => {
  console.error('❌ Erro durante a execução dos testes:', err);
  process.exit(1);
});
