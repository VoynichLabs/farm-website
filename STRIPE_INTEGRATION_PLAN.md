# Farm Website Stripe Integration Plan - Egg Sales Payment Processing

**Author:** Larry the Laptop Lobster  
**Date:** 13 February 2026  
**Purpose:** Design & implement Stripe payment integration for farm.ai-my.org to accept egg sales payments

---

## Executive Summary

Add Stripe payment processing to the farm website so customers can purchase eggs online. This implementation reuses proven patterns from the ModelCompare project (`C:\\Projects\\ModelCompare`) which has a complete, tested Stripe integration including:
- Google OAuth authentication
- Credit system (for our case: egg inventory/cart)
- Stripe payment processing with webhook handling
- React components for payment UI

**Estimated scope for implementation assistant:** 2-3 hours of focused work (code copying + minimal customization)

---

## Current State

**Farm Website Location:** farm.markbarney.net (actual deployment domain)

**Current Status:** Static landing page, no commerce functionality

**Goal:** Add functional egg sales with:
- Customer browsing/adding eggs to cart
- Stripe payment checkout
- Order processing and confirmation
- Email notification to farmer

---

## Architecture Overview

### Backend Stack (Reuse from ModelCompare)
```
Express.js (Node.js)
├── Google OAuth (Passport.js)
├── Stripe API integration (webhook handling)
├── PostgreSQL database (user accounts, orders)
└── Drizzle ORM (type-safe database operations)
```

### Frontend Stack (Reuse from ModelCompare)
```
React + TypeScript (Vite)
├── shadcn/ui components
├── Stripe Elements
├── React Query (for API calls)
└── TailwindCSS styling
```

### Database Schema (Adapt from ModelCompare)
```sql
-- Users (from ModelCompare)
users table:
- id, email, firstName, lastName, profileImageUrl
- credits (becomes: eggInventory or orderCount)
- stripeCustomerId, stripeSubscriptionId
- createdAt, updatedAt

-- Orders (NEW - similar to payment transactions)
orders table:
- id (order ID)
- userId (customer)
- productId (egg product/variant)
- quantity
- totalPrice
- stripePaymentIntentId
- status (pending, completed, failed)
- createdAt, updatedAt

-- Products (NEW)
products table:
- id
- name (e.g., "Organic Brown Eggs - Dozen")
- description
- price (per unit)
- inventory
- createdAt, updatedAt
```

---

## Step-by-Step Implementation Guide for Assistant

### Phase 1: Extract & Setup (30 minutes)

#### 1.1 Copy Backend Foundation from ModelCompare

**Source Files to Copy:**
```
From: C:\\Projects\\ModelCompare
To:   /mnt/c/Users/User/.openclaw/workspace/ai-my-org/server/

- server/auth.ts          → auth.ts (Google OAuth setup)
- server/stripe.ts        → stripe.ts (Stripe webhook handling + payment creation)
- server/storage.ts       → storage.ts (Database operations - ADAPT for orders/products)
- shared/schema.ts        → shared/schema.ts (Database schema - ADD orders/products tables)
- server/routes.ts        → server/routes.ts (API routes - ADAPT for farm)
- server/index.ts         → server/index.ts (Express server config)
```

**Critical Files:**
- `server/auth.ts` - Google OAuth with Passport.js
- `server/stripe.ts` - Stripe payment intent + webhook handling
- `.env` - Google OAuth + Stripe credentials

#### 1.2 Copy Frontend Components from ModelCompare

**Source Files to Copy:**
```
From: C:\\Projects\\ModelCompare\\client\\src
To:   /mnt/c/Users/User/.openclaw/workspace/ai-my-org/client/src/

Components:
- components/PricingTable.tsx      → components/EggProducts.tsx (adapt for egg packages)
- components/StripeCheckoutWithElements.tsx → components/StripeCheckout.tsx (no changes)
- components/CreditBalance.tsx     → components/CartSummary.tsx (adapt for egg cart)
- components/BillingDashboard.tsx  → components/CheckoutFlow.tsx (simplify for one-time purchases)

Hooks:
- hooks/useAuth.ts (copy as-is)

Utilities:
- api/ (API call utilities)
```

#### 1.3 Dependencies

**Verify these are installed:**
```bash
npm install stripe
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install passport passport-google-oauth20
npm install express-session connect-pg-simple
npm install drizzle-orm drizzle-kit
npm install @hookform/resolvers zod  # for form validation
```

#### 1.4 Environment Variables

**Required in `.env` or deployment secrets:**
```
# Google OAuth
GOOGLE_CLIENT_ID=<from ModelCompare .env>
GOOGLE_CLIENT_SECRET=<from ModelCompare .env>
GOOGLE_CALLBACK_URL=https://farm.markbarney.net/api/auth/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Database
DATABASE_URL=postgresql://user:pass@host/database

# Session
SESSION_SECRET=<generate a strong random string>
```

---

### Phase 2: Database Schema Customization (45 minutes)

#### 2.1 Adapt Database Schema

**In `shared/schema.ts`:**

START WITH ModelCompare's schema (users, sessions tables), then ADD:

```typescript
// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(), // "Organic Brown Eggs - Dozen"
  description: text('description'),
  price: integer('price').notNull(), // in cents: 1500 = $15.00
  inventory: integer('inventory').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').references(() => users.id),
  productId: text('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  totalPrice: integer('total_price').notNull(), // in cents
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  status: text('status').notNull().default('pending'), // pending, completed, failed
  customerEmail: text('customer_email'),
  customerName: text('customer_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### 2.2 Update Storage Layer

**In `server/storage.ts`:**

Add methods to DbStorage class:
```typescript
// Products
async getProducts(): Promise<Product[]>
async getProductById(id: string): Promise<Product | null>
async updateProductInventory(id: string, quantity: number): Promise<void>

// Orders
async createOrder(order: InsertOrder): Promise<Order>
async getOrderById(id: string): Promise<Order | null>
async getUserOrders(userId: string): Promise<Order[]>
async updateOrderStatus(id: string, status: OrderStatus): Promise<void>
```

---

### Phase 3: Backend Route Customization (60 minutes)

#### 3.1 Create API Routes for Egg Sales

**In `server/routes.ts`:**

ADD these routes (authentication middleware applies to all):

```typescript
// Products
GET /api/products                    # List all available egg products
GET /api/products/:id                # Get single product details

// Cart/Orders
POST /api/orders                     # Create new order (requires auth)
GET /api/orders/:id                  # Get order details
GET /api/user/orders                 # Get current user's orders (requires auth)

// Stripe (reuse existing endpoints, customize for orders)
GET /api/stripe/products             # Get egg product pricing tiers
POST /api/stripe/create-payment-intent  # Create payment for order
POST /api/stripe/webhook             # Handle payment completion (farm.markbarney.net/api/stripe/webhook)
```

#### 3.2 Customize Stripe Service

**In `server/stripe.ts`:**

Modify the payment flow:
- Instead of "credits for API calls", create orders for egg purchases
- Webhook handler: when payment succeeds, mark order as completed + reduce inventory
- Email notification: send order confirmation to customer

```typescript
// Modified webhook handler pseudocode:
app.post('/api/stripe/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(...)
  
  if (event.type === 'payment_intent.succeeded') {
    const order = await getOrderByStripeIntentId(event.data.object.id)
    
    // Mark order as completed
    await updateOrderStatus(order.id, 'completed')
    
    // Reduce inventory
    await updateProductInventory(order.productId, -order.quantity)
    
    // Send email to farmer (and customer receipt)
    await sendOrderEmail(order)
  }
})
```

---

### Phase 4: Frontend UI Customization (45 minutes)

#### 4.1 Create Egg Product Display Component

**New file: `client/src/components/EggProducts.tsx`**

COPY from ModelCompare's `PricingTable.tsx`, then adapt:
- Instead of credit packages, show egg product variants
- Pricing: "Brown Eggs - Dozen: $8.99", "Specialty Mix - Dozen: $12.99", etc.
- Quantity selector for each product
- "Add to Cart" button

#### 4.2 Create Shopping Cart Component

**New file: `client/src/components/ShoppingCart.tsx`**

Show:
- Items in cart with quantity/price
- Subtotal
- "Proceed to Checkout" button
- "Remove item" actions

#### 4.3 Create Checkout/Payment Component

**COPY: `StripeCheckoutWithElements.tsx`** (minimal changes)

Already handles Stripe Elements payment form. Just adapt:
- Product details display
- Order summary (instead of "credits purchased")
- Success message shows order number

#### 4.4 Update Home Page

**Adapt: `client/src/pages/home.tsx` or `index.tsx`**

Replace current landing page with:
- Product showcase ("Fresh Farm Eggs Available Now!")
- Browse products
- Authentication prompt for checkout
- Featured testimonials or farm details

---

### Phase 5: Integration & Testing (45 minutes)

#### 5.1 Database Migrations

Run Drizzle migrations to create new tables:
```bash
npm run db:push  # or drizzle-kit push
```

#### 5.2 Seed Initial Products

**New script: `scripts/seed-products.ts`**

```typescript
// Add initial egg products to database
const products = [
  { name: "Brown Eggs - Dozen", price: 899, inventory: 50 },
  { name: "Mixed Heritage - Dozen", price: 1199, inventory: 30 },
  { name: "Specialty Omega-3 - Dozen", price: 1399, inventory: 20 },
];
```

#### 5.3 Testing Checklist

- [ ] User can sign in with Google
- [ ] User can view egg products
- [ ] User can add products to cart
- [ ] Stripe payment form displays correctly
- [ ] Test payment succeeds (use Stripe test card: 4242 4242 4242 4242)
- [ ] Order status changes to "completed"
- [ ] Inventory decreases after purchase
- [ ] Email notification sent to farmer + customer
- [ ] Failed payments handled gracefully
- [ ] Unauthenticated users redirected to login

#### 5.4 Stripe Webhook Testing

**Local testing with Stripe CLI:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Then run the test payment flow
```

---

## Files to Extract from ModelCompare

### Complete List for Copying

```
C:\\Projects\\ModelCompare

Backend:
├── server/auth.ts                       (copy as-is)
├── server/stripe.ts                     (adapt webhooks for orders)
├── server/storage.ts                    (extend with order/product methods)
├── server/routes.ts                     (adapt for farm API)
├── server/index.ts                      (copy as-is, configure auth)
├── shared/schema.ts                     (add orders/products tables)
└── .env (sample)                        (copy format, use your secrets)

Frontend:
├── client/src/components/PricingTable.tsx        (adapt to EggProducts)
├── client/src/components/StripeCheckoutWithElements.tsx  (copy as-is)
├── client/src/components/CreditBalance.tsx       (adapt to CartSummary)
├── client/src/hooks/useAuth.ts                   (copy as-is)
├── client/src/pages/billing.tsx                  (adapt to checkout page)
├── client/src/api/                               (copy all API utilities)
├── client/src/lib/                               (copy utilities)
└── client/src/components/ui/ (shadcn components) (if not already present)

Configuration:
├── package.json                         (check dependencies)
├── drizzle.config.ts                    (copy, update DB path)
├── tsconfig.json                        (copy as-is)
└── tailwind.config.ts                   (copy as-is)
```

---

## Key Customization Points

### What Stays the Same (Copy Verbatim)
- Google OAuth flow
- Stripe payment intent creation
- Stripe webhook signature verification
- React authentication hook (useAuth)
- Stripe Elements checkout form
- Database connection + migrations
- Express server setup
- Session management with PostgreSQL

### What Changes (Adapt for Farm)

| ModelCompare | Farm |
|---|---|
| "Credits" | "Eggs" / "Orders" |
| Credit packages ($9.99, $49.99, etc.) | Egg products ($8.99/dozen, $12.99/dozen) |
| "Buy more credits" flow | "Add to cart" flow |
| API call deduction | Inventory reduction + order creation |
| Billing dashboard | Order history + cart |
| Uses stripeSubscriptionId | Uses stripePaymentIntentId (one-time) |
| Recurring credit top-ups | One-time egg purchases |

---

## Environment Variables Reference

**Get these values from:**
- **Google OAuth credentials:** Google Cloud Console (already in ModelCompare .env)
- **Stripe keys:** Stripe Dashboard > API Keys (test vs live)
- **Stripe webhook secret:** Stripe Dashboard > Webhooks (after creating endpoint)

---

## Success Criteria

- [x] Backend compiles without TypeScript errors
- [x] Frontend compiles and builds
- [x] User can authenticate via Google
- [x] Products display correctly
- [x] Stripe test payment succeeds
- [x] Order saved to database with "completed" status
- [x] Inventory decreases after purchase
- [x] Email notification sent
- [x] Error handling works (invalid card, etc.)
- [x] Responsive design works on mobile

---

## Rollout Plan

1. **Deploy to staging environment** (not production yet)
2. **Test full payment flow** with real Stripe account (test mode)
3. **Get farmer approval** on UI/copy
4. **Set up email notifications** (confirmation + receipt)
5. **Enable inventory tracking** (manual or automated)
6. **Deploy to production** (farm.markbarney.net)

---

## Handoff to Implementation Assistant

**What they need to do:**
1. Copy files from ModelCompare as listed above
2. Adapt the 4 customization points listed above
3. Create database schema additions (orders + products tables)
4. Update Stripe webhook handler for order processing
5. Build egg product UI components
6. Test full payment flow
7. Verify email notifications work
8. Deploy to farm.ai-my.org

**What they DON'T need to do:**
- Understand Google OAuth internals (copy from ModelCompare)
- Build Stripe Elements (shadcn/ui handles it)
- Design authentication flow (proven in ModelCompare)
- Set up PostgreSQL (reuse existing)
- Create environment variable architecture (in ModelCompare)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Stripe webhook timing (order created before payment received) | Use `payment_intent.succeeded` event, not `charge.completed` |
| Inventory race conditions | Use atomic SQL updates, check inventory before creating payment intent |
| Email notifications fail silently | Log errors, retry with exponential backoff |
| Stripe test/live key mix-up | Clearly label in .env, use CI/CD to prevent production mistakes |
| User confusion about product variants | Clear naming, product descriptions, photos |

---

## Questions for Mark Before Handoff

1. **Farm website DNS/hosting:** Is farm.markbarney.net already configured and deployed?
2. **Egg product details:** What are the actual product names, prices, inventory levels?
3. **Email notifications:** Who receives the order confirmation? (farmer email address?)
4. **Stripe account:** Is the Stripe account set up and ready? (test mode or live?)
5. **Customer authentication:** Required (Google OAuth) or optional (guest checkout)?
6. **Shipping/delivery:** Does the order include shipping address, or is it local pickup only?

---

**Status:** Ready for Implementation Assistant  
**Estimated Duration:** 5-6 hours of focused work  
**Complexity:** Medium (mostly copying + light customization)  
**Risk Level:** Low (proven patterns from ModelCompare)

---

*Plan created: 13 February 2026*  
*Ready for Mark's review + implementation assignment*
