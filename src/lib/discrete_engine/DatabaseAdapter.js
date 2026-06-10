import { createClient } from '@supabase/supabase-js';

/**
 * Database Adapter / ORM Layer
 * Acts as the secure isolation barrier for the Discrete Math Engine.
 * Enforces multi-tenant data boundaries by requiring `shopId` injection
 * before any database operations execute.
 */
export class SecureDatabaseAdapter {
  constructor(shopId) {
    if (!shopId) throw new Error("CRITICAL: DatabaseAdapter initialized without a Tenant ID (shopId)");
    
    this.shopId = shopId;
    
    // Initialize Supabase Client
    const supabaseUrl = process.env.SUPABASE_URL || 'https://dmlrpjtjabanopetnnqt.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbHJwanRqYWJhbm9wZXRubnF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA4MjA1NCwiZXhwIjoyMDk2NjU4MDU0fQ.2EWNGNbOznPdvJS-n3-sfpvb8fP5yxs1_V2GGPeDUds';
    
    this.db = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Securely fetch products belonging exclusively to this tenant.
   */
  async getTenantProducts() {
    return await this.db
      .from('menu_items')
      .select('id')
      .eq('shop_id', this.shopId);
  }

  /**
   * Securely fetch transactional telemetry for this tenant within a time window.
   */
  async getTenantTransactions(startDate, endDate) {
    return await this.db
      .from('order_items')
      .select('menu_item_id, quantity, orders!inner(created_at, shop_id, total_price)')
      .eq('orders.shop_id', this.shopId)
      .gte('orders.created_at', startDate)
      .lte('orders.created_at', endDate);
  }

  /**
   * Append raw incoming telemetry from external POS systems directly into the database.
   */
  async ingestTelemetryPayload(telemetryPayload) {
    // 1. Create the Order
    const { data: orderData, error: orderError } = await this.db
      .from('orders')
      .insert({
        shop_id: this.shopId,
        total_price: telemetryPayload.totalPrice,
        status: 'completed', // Live ingested POS telemetry
        created_at: telemetryPayload.timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to ingest telemetry order: ${orderError.message}`);

    // 2. Insert Order Items (Array Map)
    const orderItems = telemetryPayload.items.map(item => ({
      order_id: orderData.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await this.db
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(`Failed to ingest telemetry items: ${itemsError.message}`);

    return orderData;
  }
}
