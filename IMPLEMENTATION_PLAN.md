# Farm Website - Stripe Integration Implementation Plan

## CRITICAL CONTEXT FOR THIS PROJECT

This is **NOT a generic e-commerce build.** This is a portfolio demonstration on Mark Barney's hobby farm, built to be shown to real working farms (alpaca operations, goat farms, etc.) as proof that we can build them a proper web presence.

**Key principles for implementation:**
- Keep it simple — real small farmers don't need complexity
- Make it feel like a REAL farm website — not generic template vibes
- Use actual farm details (Hampton, CT location, actual product names)
- Assume someone will be shown this website and judged by it
- This is the sales tool for the entire prospecting business

## Implementation Guide

The complete step-by-step implementation is in `STRIPE_INTEGRATION_PLAN.md` (this repo).

That document includes:
- Phase-by-phase breakdown
- Files to copy from ModelCompare project (`C:\Projects\ModelCompare`)
- Database schema design
- Backend route specifications
- Frontend component development
- Testing and deployment procedures

## Quick Reference

**Estimated Duration:** 5-6 hours  
**Complexity:** Medium  
**Risk Level:** Low  
**Success Criteria:** Portfolio-quality e-commerce that real farm customers would be impressed by

**Key Phases:**
1. Extract & Setup (30 min)
2. Database Schema (45 min)
3. Backend Routes (60 min)
4. Frontend UI (45 min) — **IMPORTANT: Make this look like a real farm site, not boilerplate**
5. Testing & Integration (45 min)

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (test mode for development)
- Google OAuth credentials
- Access to ModelCompare project (`/mnt/d/1Projects/ModelCompare/`) for reference
- Actual farm details: Mark Barney's hobby farm in Hampton, CT with chickens

## What the Next Assistant Should Know

- **Who:** Mark Barney (owner) at 653 Pudding Hill Road, Hampton, Connecticut
- **What:** Hobby farm with chickens (and two Yorkies named Pawel & Pawleen)
- **Why:** Portfolio demo for prospecting working farms
- **How:** Clean, simple e-commerce (browse → cart → Stripe → order confirmation)
- **Success:** This website should impress real farm customers enough to want something similar

## Important: Farm Personality

When building the frontend, think about what a real farm website would look like:
- Real farm location and imagery
- Honest, down-home tone (not corporate)
- Clear product info without unnecessary complexity
- Trust-building (owner name, location, real details)
- Mobile-friendly (farmers use phones)

This isn't just code. It's a sales demonstration.
