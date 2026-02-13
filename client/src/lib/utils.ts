import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge Tailwind classes safely (used by shadcn/ui components)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
