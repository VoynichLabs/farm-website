/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Home/landing page for the farm website.
 *          Hero section, farm intro, featured products call-to-action.
 *          Designed to feel like a real farm — not corporate template.
 * SRP/DRY check: Pass
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Egg, Heart, ShoppingCart } from "lucide-react";

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero section */}
      <section className="relative bg-farm-green text-white py-20 px-4 -mt-0 rounded-b-3xl">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Fresh Eggs from<br />Our Farm to Your Table
          </h1>
          <p className="text-lg text-green-100 max-w-xl mx-auto">
            Locally raised, free-range chickens on our hobby farm in Hampton, Connecticut.
            Order online, pick up fresh.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products">
              <Button size="lg" className="bg-white text-farm-green hover:bg-green-50 font-semibold">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Shop Fresh Eggs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About the farm */}
      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-bold text-center text-gray-900">About Our Farm</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <MapPin className="w-8 h-8 mx-auto text-farm-green" />
            <h3 className="font-semibold text-gray-900">Hampton, Connecticut</h3>
            <p className="text-sm text-gray-600">
              653 Pudding Hill Road — a quiet corner of the NECCOG region 
              where our chickens roam free.
            </p>
          </div>
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Egg className="w-8 h-8 mx-auto text-farm-gold" />
            <h3 className="font-semibold text-gray-900">Farm Fresh Eggs</h3>
            <p className="text-sm text-gray-600">
              Our hens produce rich, flavorful eggs with deep orange yolks.
              No hormones, no antibiotics — just happy chickens.
            </p>
          </div>
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Heart className="w-8 h-8 mx-auto text-farm-red" />
            <h3 className="font-semibold text-gray-900">Family Operation</h3>
            <p className="text-sm text-gray-600">
              Run by Mark Barney with the help of Pawel & Pawleen, 
              our two Yorkshire Terriers who think they run the place.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 text-center space-y-4 pb-8">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Order?</h2>
        <p className="text-gray-600">
          Browse our selection of farm-fresh eggs and place your order for local pickup.
        </p>
        <Link href="/products">
          <Button size="lg">
            <Egg className="w-5 h-5 mr-2" />
            View Products
          </Button>
        </Link>
      </section>
    </div>
  );
}
