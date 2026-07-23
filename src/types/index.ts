export interface BotConversaSubscriber {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  custom_fields?: Record<string, any>;
}

export interface BotConversaWebhookPayload {
  event?: string;
  subscriber: BotConversaSubscriber;
  message?: {
    id: string;
    text?: string;
    type?: string;
    media_url?: string;
  };
  // Outros formatos possíveis vindos do webhook do BotConversa
  text?: string;
  subscriber_id?: string;
  phone?: string;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  selectedOptions?: { name: string; value: string }[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  featuredImage?: { url: string; altText?: string };
  images?: { url: string; altText?: string }[];
  variants: ShopifyProductVariant[];
  onlineStoreUrl?: string;
}

export interface KnowledgeEntry {
  id: string;
  category: 'faq' | 'objection' | 'learned_conversation' | 'product_note';
  question_or_topic: string;
  answer_or_resolution: string;
  source: 'config' | 'user_feedback' | 'chat_learning';
  createdAt: string;
}

export interface ConversationLog {
  id: string;
  subscriberId: string;
  subscriberPhone?: string;
  customerMessage: string;
  agentResponse: string;
  timestamp: string;
  confidenceScore?: number;
  unhandledObjection?: boolean;
}
