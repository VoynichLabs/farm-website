# Changelog

## [1.0.1] - 2026-02-13

### Fixed -- Standards Remediation (Cascade / Claude Sonnet)

**What**: Full compliance pass against Mark's Coding Standards and CLAUDE.md.

**Why**: Initial 1.0.0 code deviated from coding standards: missing file headers on
UI components (utils, button, card, badge, separator), emoji/glyphs in console output
(server/index.ts, scripts/seed-products.ts), hallucinated farm content in Home.tsx and
seed-products.ts, em-dash characters violating UTF-8 clean standard, and a TypeScript
lint error in routes.ts.

**How**:
- Added required file headers (Author, Date, PURPOSE, SRP/DRY) to all 5 missing UI files
- Updated all existing file headers to be more verbose with real integration details
- Removed all emoji/glyphs from server/index.ts and scripts/seed-products.ts
- Replaced all em-dash characters with double hyphens in shared/schema.ts
- Rewrote Home.tsx with real FARM.md content: roosters (Lil Big Red Jr., Whitey Redlegs),
  hen breeds (Easter Eggers, Speckled Sussex, Barred Rock, Birdadette), fertilized egg
  selling points, dogs (Pawel, Pawleen), and Windham County location details
- Replaced seed product data with real offerings: Blue Eggs (Easter Egger), Heritage Mix
  (Speckled Sussex/Barred Rock/Easter Egger), Hatching Eggs (fertilized for incubation)
- Updated Products.tsx page heading with real breed names and location
- Updated App.tsx footer with Windham County and accurate farm description
- Fixed TypeScript lint error in routes.ts (req.params.id string|string[] handling)
- Removed word "placeholder" from Products.tsx code comment
- Created remediation plan doc: docs/2026-02-13-standards-remediation-plan.md

## [1.0.0] - 2026-02-13

### Added -- Initial Farm E-Commerce Setup (Cascade / Claude Sonnet)
- **Backend**: Express.js server with Google OAuth (Passport.js), Stripe payment processing, PostgreSQL via Drizzle ORM
- **Database schema**: `users`, `products`, `orders`, `sessions` tables
- **API routes**: Auth (Google OAuth), products (public), checkout (authenticated), orders (authenticated), Stripe webhook
- **Frontend**: React + Vite + TailwindCSS SPA with wouter routing
- **Pages**: Home (farm landing), Products (egg catalog), Cart/Checkout (Stripe Elements), Orders (history)
- **Components**: Navbar, StripeCheckout, shadcn/ui (Button, Card, Badge, Separator)
- **Hooks**: `useAuth` (Google OAuth session), `useCart` (localStorage-persisted shopping cart)
- **Seed script**: 3 egg products (Blue Eggs, Heritage Mix, Hatching Eggs)
- **Config**: Vite, Tailwind (farm-themed palette), Drizzle, PostCSS, TypeScript

### Architecture
- Adapted from ModelCompare project patterns (proven Stripe + OAuth flow)
- Simplified credit system to one-time egg purchase orders
- Cart stored client-side, orders created server-side on checkout
- Stripe webhook confirms payment, marks order completed, decrements inventory
