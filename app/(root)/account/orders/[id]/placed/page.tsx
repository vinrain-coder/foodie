"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Breadcrumb from "@/components/shared/breadcrumb";
import { getOrderById, SerializedOrder } from "@/lib/actions/order.actions";
import { formatId } from "@/lib/utils";

const colors = ["#EAB308", "#CA8A04", "#A16207", "#FACC15", "#854D0E"];

const normalizeOrderIdParam = (value: string | string[] | undefined) => {
  const candidate = decodeURIComponent(
    Array.isArray(value) ? value[0] : value || "",
  ).trim();
  const objectIdMatch = candidate.match(/[a-f0-9]{24}/i);
  return objectIdMatch ? objectIdMatch[0] : candidate;
};

export default function OrderPlacedPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const orderId = normalizeOrderIdParam(params?.id);
  const accessToken = searchParams.get("accessToken");

  const [order, setOrder] = useState<SerializedOrder | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId, accessToken || undefined).then((res) => {
        setOrder(res);
      });
    }
  }, [orderId, accessToken]);

  const confettiParticles = useMemo(() => {
    if (!mounted) return [];

    return Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: Math.random() * 360,
    }));
  }, [mounted]);

  const sparkles = useMemo(() => {
    if (!mounted) return [];

    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      angle: Math.random() * 360,
      distance: 20 + Math.random() * 20,
      delay: Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [mounted]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center relative overflow-hidden bg-linear-to-br from-background via-muted/10 to-background py-20">
      <div className="absolute top-4 z-20">
        <Breadcrumb />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute w-2 h-2 rounded-full"
            style={{ left: `${p.x}%`, backgroundColor: p.color }}
            initial={{ y: -10, opacity: 1, rotate: 0 }}
            animate={{ y: "100vh", opacity: 0, rotate: 720 + p.rotate }}
            transition={{
              delay: p.delay,
              duration: p.duration,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative mx-auto mb-10 w-32 h-32 flex items-center justify-center"
        >
          {sparkles.map((s) => {
            const x = s.distance * Math.cos((s.angle * Math.PI) / 180);
            const y = s.distance * Math.sin((s.angle * Math.PI) / 180);

            return (
              <motion.div
                key={s.id}
                className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x, y, opacity: 0 }}
                transition={{ delay: s.delay, duration: 0.6 }}
              />
            );
          })}

          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
            <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-5xl font-extrabold mb-4"
        >
          Order Placed Successfully!
        </motion.h1>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-muted/50 mb-8"
        >
          <Package className="h-4 w-4" />
          <span className="text-sm font-semibold">
            Order #{order ? formatId(order._id) : formatId(orderId || "")}
          </span>
        </motion.div>

        <div className="flex gap-4 justify-center">
          <Link href={`/account/orders/${orderId}`}>
            <Button className="px-6 py-3">View Order</Button>
          </Link>

          <Link href="/search">
            <Button variant="outline" className="px-6 py-3 border">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
