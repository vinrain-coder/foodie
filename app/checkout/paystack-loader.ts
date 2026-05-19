export const PAYSTACK_SCRIPT_ID = "paystack-script";
export const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v2/inline.js";

export type PaystackTransactionReference = { reference: string };

/**
 * Paystack InlineJS v2 transaction options
 * Reference: https://paystack.com/docs/guides/migrating-from-inlinejs-v1-to-v2/
 */
export type PaystackTransactionOptions = {
  key: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (response: PaystackTransactionReference) => void;
  onCancel: () => void;
};

/**
 * Paystack InlineJS v2 popup interface
 * Constructor-based API with newTransaction method
 */
declare global {
  interface Window {
    PaystackPop?: {
      new (): {
        newTransaction: (options: PaystackTransactionOptions) => void;
      };
    };
  }
}

let paystackScriptPromise: Promise<void> | null = null;

function findExistingPaystackScript() {
  const scriptById = document.getElementById(
    PAYSTACK_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (scriptById) return scriptById;

  return (
    Array.from(document.scripts).find((script) => {
      const src = script.getAttribute("src");

      return src === PAYSTACK_SCRIPT_SRC || script.src === PAYSTACK_SCRIPT_SRC;
    }) ?? null
  );
}

export function loadPaystackScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.PaystackPop) {
    return Promise.resolve();
  }

  if (paystackScriptPromise) {
    return paystackScriptPromise;
  }

  paystackScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = findExistingPaystackScript();

    const markLoadedAndResolve = (script?: HTMLScriptElement | null) => {
      if (window.PaystackPop) {
        script?.setAttribute("id", PAYSTACK_SCRIPT_ID);
        script?.setAttribute("data-loaded", "true");
        resolve();
      } else {
        reject(
          new Error("Paystack script loaded but PaystackPop is unavailable."),
        );
      }
    };

    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        markLoadedAndResolve(existingScript);
        return;
      }

      existingScript.addEventListener(
        "load",
        () => markLoadedAndResolve(existingScript),
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Paystack script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = PAYSTACK_SCRIPT_ID;
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => markLoadedAndResolve(script);
    script.onerror = () => reject(new Error("Failed to load Paystack script."));
    document.body.appendChild(script);
  }).catch((error) => {
    paystackScriptPromise = null;
    throw error;
  });

  return paystackScriptPromise;
}
