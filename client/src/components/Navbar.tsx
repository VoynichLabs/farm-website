/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Top navigation bar for Mark's Hobby Farm website.
 *          Shows farm branding (Pudding Hill Road, Hampton CT), nav links,
 *          cart item count badge, and Google OAuth auth state.
 *          Depends on useAuth hook, wouter for routing, lucide-react for icons.
 * SRP/DRY check: Pass - single navbar component, no duplication
 */

import { Link, useLocation } from "wouter";
import { ShoppingCart, User, LogOut, Egg } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface NavbarProps {
  cartItemCount: number;
}

export function Navbar({ cartItemCount }: NavbarProps) {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Farm brand / logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <Egg className="w-7 h-7 text-farm-green" />
          <div>
            <span className="font-bold text-lg text-gray-900">Mark's Farm</span>
            <span className="hidden sm:inline text-xs text-gray-500 ml-2">Hampton, CT</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/">
            <Button variant={location === "/" ? "secondary" : "ghost"} size="sm">
              Home
            </Button>
          </Link>

          <Link href="/products">
            <Button variant={location === "/products" ? "secondary" : "ghost"} size="sm">
              Shop Eggs
            </Button>
          </Link>

          {isAuthenticated && (
            <Link href="/orders">
              <Button variant={location === "/orders" ? "secondary" : "ghost"} size="sm">
                My Orders
              </Button>
            </Link>
          )}

          {/* Cart button */}
          <Link href="/cart">
            <Button variant={location === "/cart" ? "secondary" : "ghost"} size="sm" className="relative">
              <ShoppingCart className="w-4 h-4" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 ml-1">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.firstName || "User"}
                  className="w-7 h-7 rounded-full border"
                />
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
              <Button variant="ghost" size="sm" onClick={logout} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={login} className="ml-1">
              Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
