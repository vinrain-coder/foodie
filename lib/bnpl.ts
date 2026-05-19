import { IOrder } from "./db/models/order.model";
import { round2 } from "./utils";

export const FINANCING_STATUSES = {
  ACTIVE: "active",
  OVERDUE: "overdue",
  COMPLETED: "completed",
  SUSPENDED: "suspended",
  DEFAULTED: "defaulted",
  CANCELLED: "cancelled",
} as const;

export type FinancingStatus = (typeof FINANCING_STATUSES)[keyof typeof FINANCING_STATUSES];

export interface BNPLFinancingInfo {
  totalPrice: number;
  amountPaid?: number;
  remainingAmount?: number;
  minimumPayment?: number;
  financingStatus?: string;
  bnplDueDate?: Date;
}

/**
 * Calculates financing state for an order
 */
export function calculateFinancingState(order: IOrder) {
  const totalPaid = order.amountPaid || 0;
  const totalPrice = order.totalPrice;
  const remainingAmount = round2(totalPrice - totalPaid);
  const progress = totalPrice > 0 ? round2((totalPaid / totalPrice) * 100) : 0;

  let status: FinancingStatus = (order.financingStatus as FinancingStatus) || FINANCING_STATUSES.ACTIVE;

  if (remainingAmount <= 0) {
    status = FINANCING_STATUSES.COMPLETED;
  } else if (status !== FINANCING_STATUSES.SUSPENDED && status !== FINANCING_STATUSES.DEFAULTED) {
    const now = new Date();
    if (order.bnplDueDate && now > order.bnplDueDate) {
      status = FINANCING_STATUSES.OVERDUE;
    } else {
      status = FINANCING_STATUSES.ACTIVE;
    }
  }

  // Calculate overdue days
  let overdueDays = 0;
  if (status === FINANCING_STATUSES.OVERDUE && order.bnplDueDate) {
    const diffTime = Math.abs(new Date().getTime() - new Date(order.bnplDueDate).getTime());
    overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    remainingAmount,
    progress,
    status,
    overdueDays,
  };
}

/**
 * Suggests the next minimum payment.
 * Ensures the suggested amount never exceeds the remaining balance.
 */
export function calculateNextSuggestedPayment(order: BNPLFinancingInfo) {
  const totalPrice = order.totalPrice ?? 0;
  const amountPaid = order.amountPaid ?? 0;
  const remainingAmount = order.remainingAmount ?? round2(totalPrice - amountPaid);

  if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) return 0;

  // Current suggested payment from order record
  const currentSuggested = order.minimumPayment || 0;

  // If remaining balance is smaller than the current suggested payment,
  // suggest the entire remaining balance.
  if (remainingAmount < currentSuggested) {
    return round2(remainingAmount);
  }

  // Otherwise, maintain the current suggested payment unless it's 0,
  // in which case we suggest 20% of remaining (standard starting point)
  if (currentSuggested <= 0) {
    return round2(Math.min(remainingAmount, Math.max(remainingAmount * 0.2, 100)));
  }

  return round2(Math.min(currentSuggested, remainingAmount));
}

/**
 * @deprecated Use calculateNextSuggestedPayment instead
 */
export function getSuggestedMinimumPayment(order: BNPLFinancingInfo) {
  return calculateNextSuggestedPayment(order);
}
