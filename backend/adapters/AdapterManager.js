const ShopifyAdapter = require('./ShopifyAdapter');
const WooCommerceAdapter = require('./WooCommerceAdapter');

class AdapterManager {
  constructor() {
    this.adapters = {
      shopify: new ShopifyAdapter(),
      woocommerce: new WooCommerceAdapter(),
      // 'custom': new CustomPosAdapter()
    };
  }

  /**
   * Translates incoming third-party webhooks into the SET-RETAIL discrete payload format
   */
  processIncomingWebhook(platformType, rawPayload) {
    const adapter = this.adapters[platformType.toLowerCase()];
    if (!adapter) {
      throw new Error(`Unsupported POS platform: ${platformType}`);
    }
    
    // Convert to the standardized mathematical ingestion format
    const standardizedPayload = adapter.standardizePayload(rawPayload);
    return standardizedPayload;
  }
}

module.exports = new AdapterManager();
