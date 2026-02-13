# ModelCompare Reference Import

Imported on: 2026-02-13
Source: C:\Projects\ModelCompare
Destination: reference\modelcompare-examples

## Copied (exact plan paths)
- server/auth.ts
- server/stripe.ts
- server/storage.ts
- server/routes.ts
- server/index.ts
- shared/schema.ts
- client/src/components/PricingTable.tsx
- client/src/components/CreditBalance.tsx
- client/src/hooks/useAuth.ts
- client/src/pages/billing.tsx
- client/src/lib
- client/src/components/ui
- package.json
- drizzle.config.ts
- tsconfig.json
- tailwind.config.ts

## Missing from source (plan listed but not found)
- .env  this is present in your folders. It might be git ignored
- client/src/components/StripeCheckoutWithElements.tsx
- client/src/api

## Copied fallback equivalents
- client/src/api -> client/src/services
- client/src/components/StripeCheckoutWithElements.tsx -> client/src/components/RealStripeCheckout.tsx
- client/src/api (alt) -> client/src/utils
