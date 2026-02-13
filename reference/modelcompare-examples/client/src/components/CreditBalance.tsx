/**
 * Author: Claude Code using Sonnet 4.5
 * Date: 2025-01-13
 * PURPOSE: Unobtrusive credit balance display in navigation bar.
 *          Shows current credit count, clickable to navigate to billing page.
 *          Visible to ALL authenticated users (device + OAuth).
 * SRP/DRY check: Pass - Single responsibility (credit display), reuses useAuth hook
 * shadcn/ui: Pass - Uses Button component from shadcn/ui
 */

import { Link } from "wouter";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function CreditBalance() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const credits = user.credits ?? 0;
  const creditColor = credits < 25
    ? "text-red-600 dark:text-red-400"
    : credits < 100
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-muted-foreground";

  return (
    <Link href="/billing">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs hover:bg-muted/50"
        title={`${credits.toLocaleString()} credits available. Click to manage billing.`}
      >
        <Coins className="w-3.5 h-3.5 mr-1.5" />
        <span className={creditColor}>
          {credits.toLocaleString()}
        </span>
      </Button>
    </Link>
  );
}

export default CreditBalance;
