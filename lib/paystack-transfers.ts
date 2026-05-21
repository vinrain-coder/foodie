type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

const PAYSTACK_BASE = "https://api.paystack.co";

const getSecret = () => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
};

async function paystackRequest<T>(path: string, init: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${getSecret()}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as PaystackResponse<T>) : null;

    if (!response.ok || !parsed?.status) {
      throw new Error(
        parsed?.message ||
          `Paystack API error: ${response.status} ${response.statusText}`,
      );
    }

    return parsed.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export type CreatePaystackRecipientInput = {
  type: "nuban" | "kepss" | "mobile_money" | "mobile_money_business";
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export async function createPaystackTransferRecipient(
  payload: CreatePaystackRecipientInput,
) {
  return paystackRequest<{
    recipient_code: string;
    type: string;
    name: string;
    active: boolean;
  }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function initiatePaystackTransfer({
  amount,
  recipient,
  reason,
  reference,
  accountReference,
  source = "balance",
}: {
  amount: number;
  recipient: string;
  reason: string;
  reference: string;
  accountReference?: string;
  source?: "balance";
}) {
  return paystackRequest<{
    transfer_code: string;
    status: string;
    reference: string;
  }>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source,
      amount,
      recipient,
      reason,
      reference,
      ...(accountReference ? { account_reference: accountReference } : {}),
    }),
  });
}

export async function finalizePaystackTransfer(transferCode: string, otp: string) {
  return paystackRequest<{ transfer_code: string; status: string }>(
    "/transfer/finalize_transfer",
    {
      method: "POST",
      body: JSON.stringify({ transfer_code: transferCode, otp }),
    },
  );
}

export const maskDestination = (value: string) => {
  const trimmed = (value || "").trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
};
