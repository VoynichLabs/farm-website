/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Tailwind CSS class merging utility. Used by all shadcn/ui components
 *          to safely combine and deduplicate Tailwind classes.
 *          Depends on clsx + tailwind-merge.
 * SRP/DRY check: Pass - single shared utility, no duplication
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes safely (used by shadcn/ui components)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
