# Feature Requirements — E-Commerce & Inventory MCP Server

## Target API
E-Commerce & Inventory API (`ecommerce-inventory-api.yaml`)

## MCP Tools

### `search_products`
- **Purpose:** Search the product catalogue
- **Parameters:** `query` (string, optional), `category` (string, optional), `min_price` (number, optional), `max_price` (number, optional), `in_stock` (boolean, optional), `sort` (enum, optional), `limit` (number, optional)
- **Behaviour:** Call `GET /products` with search parameters. Handle offset-based pagination to return the requested number of results.
- **Return:** Array of matching products with inventory availability.

### `manage_inventory`
- **Purpose:** Check, reserve, or release inventory for a SKU
- **Parameters:** `action` (enum: check/reserve/release, required), `sku` (string, required), `quantity` (number, required for reserve), `reservation_id` (string, required for release), `order_reference` (string, optional for reserve)
- **Behaviour:**
  - `check`: Call `GET /inventory/{sku}`
  - `reserve`: Call `POST /inventory/{sku}/reserve` with idempotency key
  - `release`: Call `POST /inventory/{sku}/release`
- **Error handling:** For insufficient inventory on reserve, return available quantity and suggest alternatives.

### `create_order` (composed)
- **Purpose:** Create a complete order with inventory reservation and payment in one operation
- **Parameters:** `customer_id` (string, required), `items` (array of {sku, quantity}, required), `shipping_address` (object, required), `billing_address` (object, optional), `shipping_method` (string, optional), `payment_method` (enum, required)
- **Behaviour:**
  1. For each item, call `POST /inventory/{sku}/reserve` with idempotency keys
  2. Calculate total from reserved items
  3. Call `POST /payments` to initiate payment
  4. Call `POST /orders` to create the order
  5. Call `POST /orders/{orderId}/confirm` with payment and reservation IDs
  6. If any step fails, roll back: release reservations, report what failed
- **Return:** Confirmed order details with payment and reservation info
- **Idempotency:** Generate and use idempotency keys for all write operations

### `process_refund`
- **Purpose:** Process a refund for an order
- **Parameters:** `order_id` (string, required), `amount` (number, optional — full refund if omitted), `reason` (string, optional)
- **Behaviour:**
  1. Call `GET /orders/{orderId}` to get payment details
  2. Call `POST /payments/{paymentId}/refund`
  3. If full refund, call `POST /orders/{orderId}/cancel`
- **Return:** Refund confirmation with updated order status

### `get_shipping_rates`
- **Purpose:** Get available shipping options for an order
- **Parameters:** `destination` (address object, required), `items` (array of {sku, quantity, weight_kg}, required)
- **Behaviour:** Call `POST /shipping/rates`. Uses a default origin address from config.
- **Return:** Sorted list of shipping options with estimated delivery.

### `create_shipment`
- **Purpose:** Create a shipment for a confirmed order
- **Parameters:** `order_id` (string, required), `carrier` (string, required), `service` (string, required)
- **Behaviour:** Call `POST /shipping/shipments` with idempotency key. Return tracking info.

### `track_order`
- **Purpose:** Get tracking info for an order's shipment
- **Parameters:** `order_id` (string, required)
- **Behaviour:**
  1. Call `GET /orders/{orderId}` to get shipment ID
  2. Call `GET /shipping/shipments/{shipmentId}/track`
- **Return:** Tracking events timeline

### `register_webhook`
- **Purpose:** Register a webhook for event notifications
- **Parameters:** `url` (string, required), `events` (array of event types, required)
- **Behaviour:** Call `POST /webhooks`. Return the webhook details including the signing secret.

### `generate_sales_report` (composed)
- **Purpose:** Generate a comprehensive sales report
- **Parameters:** `start_date` (date, required), `end_date` (date, required), `group_by` (enum: day/week/month, optional)
- **Behaviour:**
  1. Call `GET /reports/sales` for revenue and order data
  2. Call `GET /reports/inventory` for stock health
  3. Combine into a unified report with insights
- **Return:** Combined sales + inventory health report

## MCP Resources

### `product://{productId}/details`
- **Purpose:** Read-only product details with inventory
- **Behaviour:** Calls `GET /products/{productId}` and returns full product detail

### `inventory://{sku}/status`
- **Purpose:** Real-time inventory status for a SKU
- **Behaviour:** Calls `GET /inventory/{sku}` and returns availability data
- **Use case:** LLM can check stock levels before suggesting products

### `order://{orderId}/tracking`
- **Purpose:** Order tracking information
- **Behaviour:** Composed call: get order, then get shipment tracking
- **Use case:** LLM can reference tracking in customer service conversations

### `store://dashboard`
- **Purpose:** Aggregated store dashboard
- **Behaviour:** Composed: calls sales report (last 7 days) + inventory report + recent orders
- **Use case:** Quick store health overview for operations conversations

## MCP Prompts

### `order_investigation`
- **Description:** Investigate issues with a specific order
- **Arguments:** `order_id` (required), `issue_description` (optional)
- **Template:** "Investigate order {order_id}. Check the order status, payment status, shipment tracking, and inventory state for all items. {issue_clause}Provide a clear timeline of events and identify the root cause of any issues."

### `inventory_restock`
- **Description:** Analyse inventory levels and suggest restock orders
- **Arguments:** `category` (optional), `urgency` (enum: routine/urgent, default: routine)
- **Template:** "Analyse current inventory levels{category_clause}. Identify items below reorder thresholds, calculate recommended restock quantities, and prioritise based on sales velocity and current stock levels. Urgency: {urgency}."

### `daily_operations`
- **Description:** Morning operations briefing
- **Arguments:** `focus_areas` (optional array, e.g. ["shipping", "inventory", "payments"])
- **Template:** "Generate a morning operations briefing. Cover: pending orders requiring action, shipping status updates, inventory alerts, payment issues, and any webhook delivery failures. {focus_clause}"

## Non-Functional Requirements

- **Auth:** OAuth2 with refresh token support. Access token from `SHOPSTACK_ACCESS_TOKEN`, refresh token from `SHOPSTACK_REFRESH_TOKEN`, client credentials from `SHOPSTACK_CLIENT_ID` and `SHOPSTACK_CLIENT_SECRET`. Auto-refresh on 401.
- **Idempotency:** All write operations must generate and send `Idempotency-Key` headers (UUIDv4)
- **Rate limiting:** Respect `429` responses with `Retry-After` header. Implement exponential backoff with max 3 retries.
- **Pagination:** Handle both offset-based (products) and cursor-based (orders) pagination transparently
- **Error handling:** Map all API errors to user-friendly messages. For composed operations, implement rollback on failure.
- **Logging:** Log all API calls with timing, status, and idempotency keys at debug level
- **Mock mode:** When `MOCK_MODE=true`, use fixture data. Mock should include: 10 products across 3 categories, realistic inventory levels (some low stock), 5 orders in various statuses, 2 customers
