class ShopifyAdapter {
  /**
   * Transforms Shopify's raw 'orders/create' webhook payload
   * into the standard SET-RETAIL discrete payload format.
   */
  standardizePayload(shopifyPayload) {
    const items = shopifyPayload.line_items.map(item => ({
      sku: item.sku || `UNKNOWN-${item.id}`,
      name: item.name,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity)
    }));

    return {
      order_id: shopifyPayload.id.toString(),
      customer_id: shopifyPayload.customer ? shopifyPayload.customer.id.toString() : "GUEST",
      customer_tier: shopifyPayload.customer && shopifyPayload.customer.orders_count > 5 ? "VIP" : "STANDARD",
      timestamp: shopifyPayload.created_at,
      items: items
    };
  }
}

module.exports = ShopifyAdapter;
