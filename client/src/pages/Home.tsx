/**
 * Author: Cascade (Claude Sonnet)
 * Date: 2026-02-13
 * PURPOSE: Home/landing page for Mark's Hobby Farm at 653 Pudding Hill Road, Hampton, CT.
 *          Content sourced from FARM.md: real bird breeds (Easter Eggers, Speckled Sussex,
 *          Barred Rock), real roosters (Lil Big Red Jr., Whitey Redlegs), fertilized egg
 *          selling points, Yorkshire Terriers (Pawel, Pawleen), and Windham County location.
 *          No placeholder or hallucinated content.
 * SRP/DRY check: Pass - verified no duplicate home page components
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MapPin, Egg, Heart, ShoppingCart, Bird, Dog } from "lucide-react";

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero section */}
      <section className="relative bg-farm-green text-white py-20 px-4 -mt-0 rounded-b-3xl">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Fertilized Eggs from<br />Pudding Hill Road
          </h1>
          <p className="text-lg text-green-100 max-w-xl mx-auto">
            Blue eggs, heritage eggs, and hatching eggs from Easter Eggers,
            Speckled Sussex, and Barred Rock hens -- all fertilized, all free-range
            in Hampton, Connecticut.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/products">
              <Button size="lg" className="bg-white text-farm-green hover:bg-green-50 font-semibold">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Shop Eggs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The flock */}
      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-bold text-center text-gray-900">The Flock</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Bird className="w-8 h-8 text-farm-green" />
            <h3 className="font-semibold text-gray-900">Our Roosters</h3>
            <p className="text-sm text-gray-600">
              <strong>Lil Big Red Jr.</strong> -- spawn of the original Big Red,
              hatched right here on the farm.{" "}
              <strong>Whitey Redlegs</strong> -- son of Lil Big Red Jr. and one
              of the Easter Egger hens, hatched from a blue egg on Mark's desk.
              Both are healthy, vigorous, and highly fertile.
            </p>
          </div>
          <div className="space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Egg className="w-8 h-8 text-farm-gold" />
            <h3 className="font-semibold text-gray-900">Our Hens</h3>
            <p className="text-sm text-gray-600">
              <strong>Birdadette</strong> -- hatched from a blue egg in May 2025,
              daughter of Lil Big Red Jr. and an Easter Egger.{" "}
              The laying flock includes <strong>Easter Eggers</strong> (blue egg production),{" "}
              <strong>Speckled Sussex</strong> (heritage breed, distinctive plumage), and{" "}
              <strong>Barred Rock</strong> (classic dual-purpose, reliable layers).
            </p>
          </div>
        </div>
      </section>

      {/* Why fertilized eggs */}
      <section className="max-w-4xl mx-auto px-4 space-y-8">
        <h2 className="text-2xl font-bold text-center text-gray-900">Why Fertilized Eggs?</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Egg className="w-8 h-8 mx-auto text-farm-green" />
            <h3 className="font-semibold text-gray-900">Superior Nutrition</h3>
            <p className="text-sm text-gray-600">
              Fertilized eggs have a superior nutritional profile compared to
              unfertilized commercial grocery store eggs. These are genuinely
              alive, fertile eggs -- not the same as mass-produced cartons.
            </p>
          </div>
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <Bird className="w-8 h-8 mx-auto text-farm-brown" />
            <h3 className="font-semibold text-gray-900">Hatch Your Own Flock</h3>
            <p className="text-sm text-gray-600">
              Every egg is fully hatchable. Buy eggs to incubate and raise your
              own hybrid birds with genetics from our proven roosters.
              Blue eggs are the signature product from our Easter Egger hens.
            </p>
          </div>
          <div className="text-center space-y-3 p-6 bg-white rounded-xl shadow-sm border">
            <MapPin className="w-8 h-8 mx-auto text-farm-red" />
            <h3 className="font-semibold text-gray-900">Eastern Connecticut</h3>
            <p className="text-sm text-gray-600">
              653 Pudding Hill Road, Hampton -- Windham County, part of the NECCOG
              member towns network. Agricultural community near the Rhode Island border.
              Local pickup available.
            </p>
          </div>
        </div>
      </section>

      {/* The dogs */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-900">Farm Security</h2>
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border space-y-3">
          <div className="flex items-center gap-2">
            <Dog className="w-8 h-8 text-farm-brown" />
            <Heart className="w-6 h-6 text-farm-red" />
          </div>
          <p className="text-sm text-gray-600">
            <strong>Pawel</strong> -- Mark's first Yorkshire Terrier, named in Minsk.
            Registered and certified service dog, trained through full certification
            by Mark. Born January 14, 2021.
          </p>
          <p className="text-sm text-gray-600">
            <strong>Pawleen</strong> -- second Yorkie, from a Pennsylvania breeder.
            Known as "too big" by the original breeder -- she weighs in at a
            massive 14 pounds. Born October 30, 2022. She thinks she runs the place.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 text-center space-y-4 pb-8">
        <h2 className="text-2xl font-bold text-gray-900">Ready to Order?</h2>
        <p className="text-gray-600">
          Blue eggs, heritage mix, or hatching eggs -- browse the selection
          and place your order for local pickup at 653 Pudding Hill Road.
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
