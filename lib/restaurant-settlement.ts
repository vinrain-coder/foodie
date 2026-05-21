import { round2 } from "./utils";
import type { ISettingInput } from "@/types";

export type RestaurantSettlementPolicy = {
  currency: string;
  holdPeriodHours: number;
  includeDeliveryFee: boolean;
  commissionBasis: "items_net";
  minPayoutAmount: number;
};

export type RestaurantSettlementBreakdown = {
  netItems: number;
  deliveryFee: number;
  commissionRate: number;
  commissionAmount: number;
  platformAmount: number;
  restaurantAmount: number;
};

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const getRestaurantSettlementPolicy = (): RestaurantSettlementPolicy => {
  const holdPeriodHours = Math.max(
    0,
    toNumber(process.env.RESTAURANT_SETTLEMENT_HOLD_HOURS, 24),
  );

  const includeDeliveryFee =
    (process.env.RESTAURANT_SETTLEMENT_INCLUDE_DELIVERY_FEE || "true")
      .trim()
      .toLowerCase() !== "false";

  const minPayoutAmount = Math.max(
    0,
    toNumber(process.env.RESTAURANT_MIN_PAYOUT_AMOUNT, 100),
  );

  const currency = (process.env.RESTAURANT_SETTLEMENT_CURRENCY || "KES")
    .trim()
    .toUpperCase();

  return {
    currency,
    holdPeriodHours,
    includeDeliveryFee,
    commissionBasis: "items_net",
    minPayoutAmount,
  };
};

const normalizeMethod = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const getPaymentMethodCommissionRate = (
  paymentMethod: string,
  setting: ISettingInput,
) => {
  const target = normalizeMethod(paymentMethod);
  const match = (setting.availablePaymentMethods || []).find(
    (method) => normalizeMethod(method.name) === target,
  );

  const raw = match ? Number(match.commission || 0) : 0;
  return Math.max(0, raw);
};

export const computeRestaurantSettlementBreakdown = ({
  itemsPrice,
  shippingPrice,
  discountAmount,
  commissionRate,
  policy,
}: {
  itemsPrice: number;
  shippingPrice: number;
  discountAmount: number;
  commissionRate: number;
  policy: RestaurantSettlementPolicy;
}): RestaurantSettlementBreakdown => {
  const safeItems = Math.max(0, round2(toNumber(itemsPrice)));
  const safeShipping = Math.max(0, round2(toNumber(shippingPrice)));
  const safeDiscount = Math.max(0, round2(toNumber(discountAmount)));
  const safeCommissionRate = Math.max(0, toNumber(commissionRate));

  const netItems = Math.max(0, round2(safeItems - safeDiscount));
  const deliveryFee = policy.includeDeliveryFee ? safeShipping : 0;
  const commissionAmount = round2((netItems * safeCommissionRate) / 100);
  const restaurantAmount = Math.max(
    0,
    round2(netItems + deliveryFee - commissionAmount),
  );
  const platformAmount = round2(netItems + deliveryFee - restaurantAmount);

  return {
    netItems,
    deliveryFee,
    commissionRate: safeCommissionRate,
    commissionAmount,
    platformAmount,
    restaurantAmount,
  };
};
