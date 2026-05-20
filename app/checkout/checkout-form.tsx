"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateFutureMinutes,
  FOOD_DELIVERY_ETA_MINUTES,
  formatDateTime,
} from "@/lib/utils";
import { AddressBookEntry } from "@/types";

import CheckoutFooter from "./checkout-footer";
import { useCheckoutForm } from "./hooks/use-checkout-form";
import {
  AddressSection,
  PaymentMethodSection,
  ShippingSpeedSection,
  CheckoutItems,
  OrderSummary,
} from "./components";
import { isCardOrMobileMoneyMethod } from "./utils/checkout-helpers";
import { loadPaystackScript } from "./paystack-loader";
import Price from "@/components/shared/menuItem/price";

const PaystackInline = dynamic(() => import("./paystack-inline"), {
  ssr: false,
});

const CheckoutForm = ({
  savedAddresses,
  selectedAddressId,
}: {
  savedAddresses: AddressBookEntry[];
  selectedAddressId?: string;
}) => {
  const form = useCheckoutForm(savedAddresses, selectedAddressId);

  const {
    session,
    site,
    items,
    discount,
    totalPrice,
    shippingAddress,
    paymentMethod,
    createdOrder,
    isAddressSelected,
    isPaymentMethodSelected,
    canPlaceOrder,
    isPlacingOrder,
  } = form;

  const renderSummary = () => (
    <OrderSummary {...form} discountAmount={discount} />
  );

  useEffect(() => {
    if (!isCardOrMobileMoneyMethod(paymentMethod)) return;

    loadPaystackScript().catch(() => {
      // PaystackInline owns the user-facing retry and error toast.
    });
  }, [paymentMethod]);

  return (
    <main className="max-w-6xl mx-auto highlight-link md:px-0 mb-12">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Section 1: Shipping Address */}
          <div className="rounded-lg shadow-sm">
            <AddressSection {...form} />
          </div>

          {/* Section 2: Payment Method */}
          <div className="border-y rounded-lg shadow-sm">
            <PaymentMethodSection {...form} />
          </div>

          {/* Section 3: Items and Shipping */}
          <div className="rounded-lg shadow-sm">
            {isPaymentMethodSelected && isAddressSelected ? (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">3 </span>
                  <span>Review items and shipping</span>
                </div>
                <Card className="md:ml-8">
                  <CardContent className="p-4">
                    <p className="mb-4 text-sm md:text-base">
                      <span className="text-lg font-bold text-green-700">
                        Arrives in about {FOOD_DELIVERY_ETA_MINUTES} mins
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ETA{" "}
                        {
                          formatDateTime(
                            calculateFutureMinutes(FOOD_DELIVERY_ETA_MINUTES),
                          ).timeOnly
                        }
                      </span>
                    </p>
                    <div className="grid md:grid-cols-2 gap-8">
                      <CheckoutItems
                        items={items}
                        menuItems={form.menuItems}
                        updateItem={form.updateItem}
                        removeItem={form.removeItem}
                      />
                      <ShippingSpeedSection
                        shippingPrice={form.shippingPrice}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex text-muted-foreground text-lg font-bold my-4 py-3">
                <span className="w-8">3 </span>
                <span>Items and shipping</span>
              </div>
            )}
          </div>

          {isPaymentMethodSelected && isAddressSelected && (
            <div className="mt-8">
              {/* Mobile summary sticky or bottom */}
              <div className="block md:hidden">
                {renderSummary()}
                {isCardOrMobileMoneyMethod(paymentMethod) && createdOrder && (
                  <div className="mt-4">
                    <PaystackInline
                      email={
                        (session?.user?.email ||
                          shippingAddress?.email) as string
                      }
                      amount={Math.round(totalPrice * 100)}
                      publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!}
                      orderId={createdOrder._id}
                      autoStart={true}
                      hideButton={false}
                      onSuccess={form.handleCompletePayment}
                      onFailure={form.handlePaymentFailure}
                      buttonLabel="Complete secure payment"
                    />
                    <p className="mt-3 text-xs text-muted-foreground">
                      Your order has been created. Complete the secure payment
                      in the Paystack window to finish checkout.
                    </p>
                  </div>
                )}
              </div>

              <Card className="hidden md:block">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                  {isCardOrMobileMoneyMethod(paymentMethod) && createdOrder ? (
                    <div className="w-full">
                      <PaystackInline
                        email={
                          (session?.user?.email ||
                            shippingAddress?.email) as string
                        }
                        amount={Math.round(totalPrice * 100)}
                        publicKey={process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!}
                        orderId={createdOrder._id}
                        autoStart={true}
                        hideButton={false}
                        onSuccess={form.handleCompletePayment}
                        onFailure={form.handlePaymentFailure}
                        buttonLabel="Complete secure payment"
                      />
                      <p className="mt-3 text-sm text-muted-foreground">
                        Your order is ready. If the payment window does not
                        appear, click the button above.
                      </p>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={form.handlePlaceOrder}
                      className="rounded-full px-12 py-6 text-lg font-bold cursor-pointer flex items-center gap-2"
                      disabled={!canPlaceOrder || isPlacingOrder}
                      hidden={
                        isCardOrMobileMoneyMethod(paymentMethod) &&
                        !!createdOrder
                      }
                    >
                      {isPlacingOrder ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />{" "}
                          Placing order...
                        </>
                      ) : (
                        "Place Your Order"
                      )}
                    </Button>
                  )}

                  <div className="flex-1 text-center md:text-right">
                    <p className="font-bold text-2xl">
                      Order Total: <Price price={totalPrice} plain />
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By placing your order, you agree to {site.name}&apos;s{" "}
                      <Link
                        href="/page/privacy-policy"
                        className="underline hover:text-primary"
                      >
                        privacy notice
                      </Link>{" "}
                      and
                      <Link
                        href="/page/conditions-of-use"
                        className="underline hover:text-primary"
                      >
                        {" "}
                        conditions of use
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <CheckoutFooter />
        </div>

        {/* Desktop Sidebar Summary */}
        <div className="hidden md:block">
          <div className="sticky top-6">{renderSummary()}</div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutForm;
