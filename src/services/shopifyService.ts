import axios from 'axios';
import { ShopifyProduct } from '../types';
import { ConfigService } from './configService';

export class ShopifyService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  private getCredentials() {
    const config = this.configService.getConfig();
    return {
      shopDomain: config.shopifyShopDomain || process.env.SHOPIFY_SHOP_DOMAIN || '',
      accessToken: config.shopifyAccessToken || process.env.SHOPIFY_ACCESS_TOKEN || '',
      apiVersion: config.shopifyApiVersion || process.env.SHOPIFY_API_VERSION || '2024-07',
      storeName: config.storeName || 'Sua Loja de Móveis'
    };
  }

  public isConfigured(): boolean {
    const { shopDomain, accessToken } = this.getCredentials();
    return Boolean(shopDomain && accessToken && !shopDomain.includes('exemplo'));
  }

  /**
    * Busca produtos no catálogo da Shopify da loja configurada pelo usuário
    */
  async searchProducts(query: string, limit: number = 5): Promise<ShopifyProduct[]> {
    const { shopDomain, accessToken, apiVersion, storeName } = this.getCredentials();

    if (!this.isConfigured()) {
      console.log(`[ShopifyService] Nenhuma loja Shopify configurada. Insira o domínio e token no Painel Web.`);
      return this.getGenericMockProducts(query, storeName);
    }

    try {
      console.log(`[ShopifyService] Conectando na API da Shopify (${shopDomain}) para buscar: "${query}"`);
      const graphqlQuery = `
        query searchProducts($query: String!, $first: Int!) {
          products(first: $first, query: $query) {
            edges {
              node {
                id
                title
                handle
                description
                productType
                vendor
                tags
                onlineStoreUrl
                priceRange {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
                featuredImage { url altText }
                images(first: 3) {
                  edges { node { url altText } }
                }
                variants(first: 5) {
                  edges {
                    node {
                      id
                      title
                      price
                      availableForSale
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`,
        {
          query: graphqlQuery,
          variables: { query, first: limit }
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const productsData = response.data?.data?.products?.edges || [];
      return productsData.map((edge: any) => {
        const p = edge.node;
        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          description: p.description,
          productType: p.productType,
          vendor: p.vendor,
          tags: p.tags,
          onlineStoreUrl: p.onlineStoreUrl || `https://${shopDomain}/products/${p.handle}`,
          priceRange: p.priceRange,
          featuredImage: p.featuredImage,
          images: p.images?.edges?.map((e: any) => e.node) || [],
          variants: p.variants?.edges?.map((e: any) => ({
            id: e.node.id,
            title: e.node.title,
            price: e.node.price,
            availableForSale: e.node.availableForSale
          })) || []
        };
      });
    } catch (error: any) {
      console.error('[ShopifyService] Erro ao conectar na Shopify:', error?.response?.data || error.message);
      return this.getGenericMockProducts(query, storeName);
    }
  }

  /**
   * Gera link direto de checkout para a loja configurada
   */
  generateCheckoutLink(variantId: string, quantity: number = 1): string {
    const { shopDomain } = this.getCredentials();
    const rawVariantId = variantId.replace('gid://shopify/ProductVariant/', '');
    const domain = shopDomain || 'sua-loja.myshopify.com';
    return `https://${domain}/cart/${rawVariantId}:${quantity}`;
  }

  /**
   * Catálogo genérico neutro de exemplo exibido enquanto o usuário não conecta a própria Shopify
   */
  private getGenericMockProducts(query: string, storeName: string): ShopifyProduct[] {
    const mockCatalog: ShopifyProduct[] = [
      {
        id: 'gid://shopify/Product/1',
        title: 'Sofá Retrátil 3 Lugares Conforto Premium',
        handle: 'sofa-retratil-3-lugares-conforto',
        description: 'Sofá retrátil com espuma de alta densidade e tecido suave ao toque. Modelo moderno para salas de estar.',
        productType: 'Sofás',
        vendor: storeName,
        tags: ['sofá', 'retrátil', 'sala'],
        priceRange: {
          minVariantPrice: { amount: '2590.00', currencyCode: 'BRL' },
          maxVariantPrice: { amount: '2990.00', currencyCode: 'BRL' }
        },
        featuredImage: {
          url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
          altText: 'Sofá Retrátil'
        },
        variants: [
          { id: 'gid://shopify/ProductVariant/101', title: 'Cinza - 2,30m', price: '2590.00', availableForSale: true },
          { id: 'gid://shopify/ProductVariant/102', title: 'Bege - 2,30m', price: '2590.00', availableForSale: true }
        ],
        onlineStoreUrl: 'https://sua-loja.myshopify.com/products/sofa-retratil-3-lugares-conforto'
      },
      {
        id: 'gid://shopify/Product/2',
        title: 'Mesa de Jantar Madeira Maciça 6 Lugares',
        handle: 'mesa-de-jantar-madeira-macica-6-lugares',
        description: 'Mesa de jantar elegante em madeira maciça com acabamento acetinado. Acompanha 6 cadeiras estofadas.',
        productType: 'Mesas de Jantar',
        vendor: storeName,
        tags: ['mesa', 'jantar', 'madeira maciça'],
        priceRange: {
          minVariantPrice: { amount: '3290.00', currencyCode: 'BRL' },
          maxVariantPrice: { amount: '3790.00', currencyCode: 'BRL' }
        },
        featuredImage: {
          url: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
          altText: 'Mesa de Jantar'
        },
        variants: [
          { id: 'gid://shopify/ProductVariant/201', title: 'Madeira Maciça + 6 Cadeiras', price: '3290.00', availableForSale: true }
        ],
        onlineStoreUrl: 'https://sua-loja.myshopify.com/products/mesa-de-jantar-madeira-macica-6-lugares'
      }
    ];

    if (!query) return mockCatalog;
    const lowerQuery = query.toLowerCase();
    return mockCatalog.filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }
}
