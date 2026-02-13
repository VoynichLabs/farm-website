# Changelog

## [1.0.0] - 2026-02-13

### Added — Initial Farm E-Commerce Setup (Cascade / Claude Sonnet)
- **Backend**: Express.js server with Google OAuth (Passport.js), Stripe payment processing, PostgreSQL via Drizzle ORM
- **Database schema**: `users`, `products`, `orders`, `sessions` tables
- **API routes**: Auth (Google OAuth), products (public), checkout (authenticated), orders (authenticated), Stripe webhook
- **Frontend**: React + Vite + TailwindCSS SPA with wouter routing
- **Pages**: Home (farm landing), Products (egg catalog), Cart/Checkout (Stripe Elements), Orders (history)
- **Components**: Navbar, StripeCheckout, shadcn/ui (Button, Card, Badge, Separator)
- **Hooks**: `useAuth` (Google OAuth session), `useCart` (localStorage-persisted shopping cart)
- **Seed script**: 3 initial egg products (Brown Eggs, Mixed Heritage, Jumbo Brown)
- **Config**: Vite, Tailwind (farm-themed palette), Drizzle, PostCSS, TypeScript

### Architecture
- Adapted from ModelCompare project patterns (proven Stripe + OAuth flow)
- Simplified credit system → one-time egg purchase orders
- Cart stored client-side, orders created server-side on checkout
- Stripe webhook confirms payment → marks order completed → decrements inventory
