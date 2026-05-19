"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronUp, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import useSettingStore from "@/hooks/use-setting-store";

import XIcon from "@/public/icons/x.svg";
import Tiktok from "@/public/icons/tiktok.svg";
import WhatsApp from "@/public/icons/whatsapp.svg";
import Youtube from "@/public/icons/youtube.svg";
import Facebook from "@/public/icons/facebook.svg";
import Instagram from "@/public/icons/instagram.svg";
import NewsletterSubscribe from "@/components/shared/newsletter-subscribe";
import { authClient } from "@/lib/auth-client";

export default function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    setting: { site, socialMedia },
  } = useSettingStore();

  const { data: session } = authClient.useSession();

  const isAuthenticated = mounted && !!session?.user;
  const isAdmin = mounted && session?.user?.role === "ADMIN";

  const whatsappNumber = socialMedia.whatsapp || "";
  const message = encodeURIComponent(`Hello, ${site.name}!`);
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${message}`
    : "#";

  const socialLinks = {
    twitter: socialMedia.twitter || "#",
    tiktok: socialMedia.tiktok || "#",
    facebook: socialMedia.facebook || "#",
    instagram: socialMedia.instagram || "#",
    youtube: socialMedia.youtube || "#",
  };

  const footerSections = useMemo(
    () => [
      {
        title: "Shop",
        links: [
          { label: "Menu Items", href: "/search" },
          { label: "Restaurants", href: "/restaurants" },
          { label: "Categories", href: "/categories" },
          { label: "Today's deals", href: "/search?tag=todays-deal" },
          { label: "Best selling items", href: "/search?tag=best-seller" },
          { label: "Coupons", href: "/coupons" },
        ],
      },
      {
        title: "My Account",
        links: [
          { label: "Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: "Wishlist", href: "/account/wishlist" },
          { label: "Cart", href: "/cart" },
          { label: "Browsing History", href: "/browsing-history" },
          ...(isAdmin
            ? [
                {
                  label: "Admin Dashboard",
                  href: "/admin/overview",
                },
              ]
            : []),
        ],
      },
      {
        title: "Get to Know Us",
        links: [
          { label: "FAQs", href: "/page/frequently-asked-questions" },
          { label: "Blogs", href: "/blogs" },
          {
            label: `About ${site.name}`,
            href: "/page/about-us",
          },
          {
            label: `${site.businessHours}`,
            href: "#",
            static: true,
          },
        ],
      },
      {
        title: "Make Money with Us",
        links: [
          { label: "Become an Affiliate", href: "/affiliate" },
          {
            label: `Sell products on ${site.name}`,
            href: "/page/sell-products",
          },
          {
            label: "Advertise Your Products",
            href: "/page/advertise-your-products",
          },
        ],
      },
      {
        title: "Let Us Help You",
        links: [
          {
            label: "Shipping Rates & Policies",
            href: "/page/shipping-rates-policies",
          },
          {
            label: "Returns & Replacements",
            href: "/page/returns-policy",
          },
          { label: "Help", href: "/page/help" },
          { label: "Track an order", href: "/track" },
          { label: "Contact support", href: "/support" },
          {
            label: "Size Guide (Shoes)",
            href: "/page/shoe-size-guide",
          },
        ],
      },
    ],
    [isAdmin, site?.name],
  );

  return (
    <footer className="bg-black text-white">
      {/* Back to Top */}
      <Button
        variant="ghost"
        className="bg-[#232f3e] hover:bg-[#37475a] text-white w-full rounded-none h-12"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ChevronUp className="mr-2 h-4 w-4" />
        Back to top
      </Button>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <NewsletterSubscribe />
        </div>

        {/* MOBILE */}
        <div className="block md:hidden mb-8">
          <Accordion
            type="single"
            collapsible
            className="border-t border-gray-800"
          >
            {footerSections.map((section, idx) => (
              <AccordionItem
                key={section.title}
                value={`item-${idx}`}
                className="border-b border-gray-800"
              >
                <AccordionTrigger className="font-bold py-4 cursor-pointer">
                  {section.title}
                </AccordionTrigger>

                <AccordionContent>
                  <ul className="space-y-3 pb-4">
                    {section.links.map((link) => (
                      <li key={link.label}>
                        {link.static ? (
                          <span className="text-gray-400 text-sm">
                            {link.label}
                          </span>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-gray-300 hover:text-white text-sm"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* DESKTOP */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-lg mb-4">{section.title}</h3>

              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.static ? (
                      <span className="text-gray-400 text-sm">
                        {link.label}
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* SOCIAL */}
          <div>
            <h3 className="font-bold text-lg mb-4">Follow us</h3>

            <div className="flex gap-4 mb-6">
              {[
                { src: Instagram, url: socialLinks.instagram },
                { src: Facebook, url: socialLinks.facebook },
                { src: XIcon, url: socialLinks.twitter, bg: true },
                { src: Tiktok, url: socialLinks.tiktok },
                { src: Youtube, url: socialLinks.youtube },
              ].map((social, i) => (
                <Link
                  key={i}
                  href={social.url}
                  target="_blank"
                  className="hover:opacity-75"
                >
                  <Image
                    src={social.src}
                    alt="social"
                    width={24}
                    height={24}
                    className={social.bg ? "bg-white rounded-sm p-0.5" : ""}
                  />
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <Link
                href={`mailto:${site.email}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <Mail size={18} />
                {site.email}
              </Link>

              <Link
                href={whatsappLink}
                target="_blank"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <Image src={WhatsApp} alt="WA" width={20} height={20} />
                Ask on WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="bg-[#0f1111] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Logo */}
            <Link
              href="/"
              className="group inline-flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <div className="relative overflow-hidden p-2">
                <Image
                  src={site?.logo ?? "/logo.png"}
                  alt="Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>

              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-bold tracking-wide text-white">
                  {site.name}
                </h2>
                <p className="text-xs text-gray-400">{site.slogan}</p>
              </div>
            </Link>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-sm">
              {[
                {
                  href: "/page/conditions-of-use",
                  label: "Conditions of Use",
                },
                {
                  href: "/page/privacy-policy",
                  label: "Privacy Notice",
                },
                {
                  href: "/page/help",
                  label: "Help Center",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-400 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full max-w-md h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />

            {/* Info */}
            <div className="space-y-2 text-xs sm:text-sm text-gray-500">
              {(site?.address || site?.phone) && (
                <p className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
                  {site?.address && <span>{site.address}</span>}
                  {site?.address && site?.phone && (
                    <span className="hidden sm:block text-gray-700">•</span>
                  )}
                  {site?.phone && <span>{site.phone}</span>}
                </p>
              )}

              <p className="text-gray-600">{site?.copyright}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
