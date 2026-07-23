const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadStoreConfig();
  loadKnowledgeBase();
  loadLogs();
  updateWebhookInput();
});

// Navegação entre Abas
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabName = item.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  const titles = {
    dashboard: 'Visão Geral do Agente',
    'store-config': 'Conectar a sua Loja Shopify',
    simulator: 'Simulador de Atendimento WhatsApp',
    knowledge: 'Base de Aprendizado & RAG',
    logs: 'Histórico de Atendimentos',
    integrations: 'Integrações & Webhooks',
    deploy: 'Publicar o App Online'
  };
  document.getElementById('header-title').innerText = titles[tabName] || 'Painel de Controle';
}

// Carrega Configurações da Shopify e Loja
async function loadStoreConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    const cfg = await res.json();

    document.getElementById('cfg-store-name').value = cfg.storeName || '';
    document.getElementById('cfg-agent-name').value = cfg.agentName || '';
    document.getElementById('cfg-shopify-domain').value = cfg.shopifyShopDomain || '';
    document.getElementById('cfg-shopify-version').value = cfg.shopifyApiVersion || '2024-07';

    document.getElementById('shop-name-display').innerText = cfg.storeName || 'Não Configurada';
    document.getElementById('sim-agent-name').innerText = cfg.agentName || 'Lucas - Consultor de Vendas';

    const statusEl = document.getElementById('stat-shopify-status');
    const domainEl = document.getElementById('stat-shopify-domain');

    if (cfg.shopifyShopDomain && cfg.shopifyAccessTokenConfigured) {
      statusEl.innerText = 'Conectado';
      statusEl.className = 'text-success';
      domainEl.innerText = cfg.shopifyShopDomain;
    } else {
      statusEl.innerText = 'Pendente';
      statusEl.className = 'text-muted';
      domainEl.innerText = 'Insira suas credenciais no menu Shopify';
    }
  } catch (err) {
    console.error('Erro ao carregar configurações da loja:', err);
  }
}

// Salva Novas Configurações da Shopify
async function handleSaveConfig(e) {
  e.preventDefault();

  const storeName = document.getElementById('cfg-store-name').value;
  const agentName = document.getElementById('cfg-agent-name').value;
  const shopifyShopDomain = document.getElementById('cfg-shopify-domain').value;
  const shopifyAccessToken = document.getElementById('cfg-shopify-token').value;
  const botConversaApiKey = document.getElementById('cfg-botconversa-token').value;
  const shopifyApiVersion = document.getElementById('cfg-shopify-version').value;

  try {
    const res = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName,
        agentName,
        shopifyShopDomain,
        shopifyAccessToken,
        botConversaApiKey,
        shopifyApiVersion
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('✅ Credenciais da Shopify e da Loja salvas com sucesso!');
      loadStoreConfig();
    } else {
      alert('Erro ao salvar: ' + (data.error || 'Tente novamente'));
    }
  } catch (err) {
    alert('Erro de conexão ao salvar configurações: ' + err.message);
  }
}

// Simulador de Mensagem de WhatsApp
async function sendSimulatedMessage() {
  const input = document.getElementById('sim-input');
  const text = input.value.trim();
  if (!text) return;

  const chatContainer = document.getElementById('chat-messages-container');

  const clientBubble = document.createElement('div');
  clientBubble.className = 'chat-bubble outgoing';
  clientBubble.innerHTML = `<p>${escapeHtml(text)}</p><span class="chat-time">${getCurrentTime()}</span>`;
  chatContainer.appendChild(clientBubble);

  input.value = '';
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble incoming';
  typingBubble.id = 'typing-indicator';
  typingBubble.innerHTML = `<p><i>Vendedor está digitando...</i></p>`;
  chatContainer.appendChild(typingBubble);

  try {
    const response = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriber_id: 'sim_user_1',
        text: text
      })
    });

    const data = await response.json();
    document.getElementById('typing-indicator')?.remove();

    const agentBubble = document.createElement('div');
    agentBubble.className = 'chat-bubble incoming';
    
    let htmlContent = `<p>${formatWhatsAppMarkdown(data.response)}</p>`;
    if (data.photo) {
      htmlContent += `<img src="${data.photo}" alt="Foto Produto Móvel" />`;
    }
    htmlContent += `<span class="chat-time">${getCurrentTime()}</span>`;
    
    agentBubble.innerHTML = htmlContent;
    chatContainer.appendChild(agentBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    loadLogs();
  } catch (err) {
    console.error('Erro na simulação:', err);
    document.getElementById('typing-indicator')?.remove();
  }
}

function handleSimKeyPress(e) {
  if (e.key === 'Enter') {
    sendSimulatedMessage();
  }
}

function runTestScenario(promptText) {
  document.getElementById('sim-input').value = promptText;
  sendSimulatedMessage();
}

// Base de Aprendizado
async function loadKnowledgeBase() {
  const container = document.getElementById('knowledge-list');
  try {
    const res = await fetch(`${API_BASE}/api/learning/knowledge`);
    const data = await res.json();

    const items = data.knowledge || [];
    document.getElementById('stat-knowledge-count').innerText = items.length;

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><p class="text-muted">Nenhum conhecimento personalizado cadastrado ainda.</p></div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="knowledge-item">
        <span class="badge ${item.category === 'objection' ? 'badge-warning' : 'badge-success'}">${item.category.toUpperCase()}</span>
        <strong>${escapeHtml(item.question_or_topic)}</strong>
        <p>${escapeHtml(item.answer_or_resolution)}</p>
      </div>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar conhecimento:', err);
  }
}

async function handleIngestSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('ingest-category').value;
  const topic = document.getElementById('ingest-topic').value;
  const resolution = document.getElementById('ingest-resolution').value;

  try {
    const res = await fetch(`${API_BASE}/api/learning/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, topic, resolution })
    });

    if (res.ok) {
      alert('✨ Novo conhecimento aprendido com sucesso pelo robô!');
      document.getElementById('ingest-form').reset();
      loadKnowledgeBase();
    }
  } catch (err) {
    alert('Erro ao salvar conhecimento: ' + err.message);
  }
}

// Histórico de Logs
async function loadLogs() {
  const tbody = document.getElementById('logs-table-body');
  try {
    const res = await fetch(`${API_BASE}/api/learning/logs`);
    const data = await res.json();

    const logs = data.logs || [];
    document.getElementById('stat-messages').innerText = logs.length;

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum atendimento realizado ainda. Teste no simulador!</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(log => `
      <tr>
        <td><small>${new Date(log.timestamp).toLocaleTimeString()}</small></td>
        <td><code>${escapeHtml(log.subscriberId)}</code></td>
        <td>${escapeHtml(log.customerMessage)}</td>
        <td><small>${escapeHtml(log.agentResponse.substring(0, 120))}...</small></td>
      </tr>
    `).reverse().join('');
  } catch (err) {
    console.error('Erro ao carregar logs:', err);
  }
}

// Copiar Webhook
function updateWebhookInput() {
  const input = document.getElementById('webhook-url-input');
  input.value = `${window.location.origin}/api/webhook/botconversa`;
}

function copyWebhookUrl() {
  const input = document.getElementById('webhook-url-input');
  input.select();
  navigator.clipboard.writeText(input.value);
  alert('📋 URL do Webhook do BotConversa copiada com sucesso!');
}

function formatWhatsAppMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
