class WooCommerceAdapter {
  /**
   * Transforms WooCommerce's raw 'order.created' webhook payload
   * into the standard SET-RETAIL discrete payload format.
   */
  standardizePayload(wooPayload) {
    const items = wooPayload.line_items.map(item => ({
      sku: item.sku || `UNKNOWN-${item.id}`,
      name: item.name,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity)
    }));

    return {
      order_id: wooPayload.id.toString(),
      customer_id: wooPayload.customer_id ? wooPayload.customer_id.toString() : "GUEST",
      customer_tier: "STANDARD", // WooCommerce requires separate API call to fetch order count, default to STANDARD
      timestamp: wooPayload.date_created_gmt + "Z", // Append Z for ISO UTC format
      items: items
    };
  }
}

module.exports = WooCommerceAdapter;
