"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Cookies from "js-cookie";
import {
  AFFILIATE_TRACKING_COOKIE_KEY,
  LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS,
} from "@/lib/affiliate-tracking";

import { authClient } from "@/lib/auth-client";
import useCartStore from "@/hooks/use-cart-store";
import useSettingStore from "@/hooks/use-setting-store";
import useIsMounted from "@/hooks/use-is-mounted";
import {
  createOrder,
  getFirstPurchaseDiscountQuote,
  SerializedOrder,
} from "@/lib/actions/order.actions";
import { subscribeToNewsletter } from "@/lib/actions/newsletter.actions";
import { validateCoupon } from "@/lib/actions/coupon.actions";
import {
  getUserAddresses,
  upsertUserAddress,
} from "@/lib/actions/address.actions";
import { getUserCoins, getUserWalletBalance } from "@/lib/actions/user.actions";
import { getMenuItemsByIds } from "@/lib/actions/menu.item.actions";
import { normalizeAddressBookEntries } from "@/lib/address-book";
import { calculateFutureMinutes, FOOD_DELIVERY_ETA_MINUTES } from "@/lib/utils";
import { ShippingAddressSchema } from "@/lib/validator";
import { AddressBookEntry, ShippingAddress } from "@/types";
import { IMenuItem } from "@/lib/db/models/menu.item.model";

import {
  getErrorMessage,
  toDiscountType,
  REQUIRED_ADDRESS_FIELDS,
  isCardOrMobileMoneyMethod,
  shippingAddressDefaultValues,
} from "../utils/checkout-helpers";

export const useCheckoutForm = (
  initialSavedAddresses: AddressBookEntry[],
  initialSelectedAddressId?: string,
) => {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isMounted = useIsMounted();

  const {
    setting: {
      site,
      common,
      availablePaymentMethods,
      defaultPaymentMethod,
      availableDeliveryDates,
    },
  } = useSettingStore();

  const {
    cart: {
      items,
      itemsPrice,
      shippingPrice,
      taxPrice,
      discount,
      totalPrice,
      note,
      shippingAddress,
      deliveryDateIndex,
      paymentMethod = defaultPaymentMethod,
    },
    setShippingAddress,
    setPaymentMethod,
    setNote,
    updateItem,
    removeItem,
    clearCart,
    setDeliveryDateIndex,
    setCartPrices,
  } = useCartStore();

  // State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    _id?: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountAmount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [createdOrder, setCreatedOrder] = useState<SerializedOrder | null>(
    null,
  );
  const [liveUserCoins, setLiveUserCoins] = useState<number | null>(null);
  const [liveUserWallet, setLiveUserWallet] = useState<number | null>(null);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [acceptMarketingEmails, setAcceptMarketingEmails] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Status flags
  const [isAddressSelected, setIsAddressSelected] = useState<boolean>(false);
  const [isPaymentMethodSelected, setIsPaymentMethodSelected] =
    useState<boolean>(false);

  // Address Book state
  const sessionAddressBook = useMemo(
    () =>
      normalizeAddressBookEntries(
        (session?.user as { addresses?: unknown[] } | undefined)?.addresses,
      ),
    [session?.user],
  );
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>(
    sessionAddressBook.length > 0 ? sessionAddressBook : initialSavedAddresses,
  );
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>(
    initialSelectedAddressId ||
      (sessionAddressBook.length > 0
        ? sessionAddressBook
        : initialSavedAddresses
      ).find((address) => address.isDefault)?.id ||
      "",
  );

  // First Purchase Discount state
  const [firstPurchaseDiscount, setFirstPurchaseDiscount] = useState<{
    eligible: boolean;
    rate: number;
    discountAmount: number;
    loading: boolean;
  }>({
    eligible: false,
    rate: 0,
    discountAmount: 0,
    loading: true,
  });

  const effectiveDiscountAmount = Math.max(
    firstPurchaseDiscount.discountAmount || 0,
    appliedCoupon?.discountAmount || 0,
  );

  const shippingAddressValidationSchema = useMemo(
    () =>
      ShippingAddressSchema.superRefine((values, ctx) => {
        if (!session && !values.email?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["email"],
            message: "Email is required for guest checkout",
          });
        }
      }),
    [session],
  );

  const shippingAddressForm = useForm<ShippingAddress>({
    resolver: zodResolver(shippingAddressValidationSchema),
    defaultValues: shippingAddress || {
      ...shippingAddressDefaultValues,
      email: "",
    },
  });

  // Sync address book from session
  useEffect(() => {
    if (!session) return;
    const nextAddressBook =
      sessionAddressBook.length > 0
        ? sessionAddressBook
        : initialSavedAddresses;
    setAddressBook(nextAddressBook);

    setSelectedSavedAddressId((currentId) => {
      if (
        currentId &&
        nextAddressBook.some((address) => address.id === currentId)
      ) {
        return currentId;
      }
      return (
        initialSelectedAddressId ||
        nextAddressBook.find((address) => address.isDefault)?.id ||
        nextAddressBook[0]?.id ||
        ""
      );
    });
  }, [
    initialSavedAddresses,
    initialSelectedAddressId,
    session,
    sessionAddressBook,
  ]);

  // Refresh address book from API
  useEffect(() => {
    if (!session) return;
    let disposed = false;

    getUserAddresses()
      .then((result) => {
        if (disposed || !result.success || !result.data) return;
        const nextAddressBook = normalizeAddressBookEntries(result.data);
        setAddressBook(nextAddressBook);
        setSelectedSavedAddressId((currentId) => {
          if (
            currentId &&
            nextAddressBook.some((address) => address.id === currentId)
          ) {
            return currentId;
          }
          return (
            nextAddressBook.find((address) => address.isDefault)?.id ||
            nextAddressBook[0]?.id ||
            ""
          );
        });
      })
      .catch((error) => {
        console.error("Failed to refresh checkout addresses:", error);
      });

    return () => {
      disposed = true;
    };
  }, [session]);

  // Fetch menuItems in cart
  useEffect(() => {
    const fetchMenuItems = async () => {
      const menuItemIds = items.map((item) => item.menuItem);
      const uniqueMenuItemIds = [...new Set(menuItemIds)];
      if (uniqueMenuItemIds.length > 0) {
        const fetchedMenuItems = await getMenuItemsByIds(uniqueMenuItemIds);
        setMenuItems(fetchedMenuItems);
      }
    };
    fetchMenuItems();
  }, [items]);

  // Fetch user coins & wallet
  useEffect(() => {
    getUserCoins().then((coins) => {
      if (coins !== null) setLiveUserCoins(coins);
    });
    getUserWalletBalance().then((balance) => {
      if (balance !== null) setLiveUserWallet(balance);
    });
  }, []);

  // Fetch first purchase discount
  useEffect(() => {
    let cancelled = false;

    const fetchFirstPurchaseDiscount = async () => {
      setFirstPurchaseDiscount((prev) => ({ ...prev, loading: true }));
      const quote = await getFirstPurchaseDiscountQuote(
        itemsPrice,
        shippingAddress?.email,
      );
      if (cancelled) return;
      setFirstPurchaseDiscount({ ...quote, loading: false });

      const effectiveDiscount = Math.max(
        quote.discountAmount || 0,
        appliedCoupon?.discountAmount || 0,
      );
      await setCartPrices(
        items,
        shippingAddress,
        deliveryDateIndex,
        effectiveDiscount,
      );
    };

    if (itemsPrice <= 0) {
      setFirstPurchaseDiscount({
        eligible: false,
        rate: 0,
        discountAmount: 0,
        loading: false,
      });
      return;
    }

    void fetchFirstPurchaseDiscount();
    return () => {
      cancelled = true;
    };
  }, [
    appliedCoupon?.discountAmount,
    deliveryDateIndex,
    items,
    itemsPrice,
    setCartPrices,
    shippingAddress,
  ]);

  // Auto-apply affiliate coupon
  const hasAutoAppliedAffiliate = useRef(false);
  useEffect(() => {
    if (
      itemsPrice > 0 &&
      !firstPurchaseDiscount.loading &&
      !appliedCoupon &&
      !isApplyingCoupon &&
      !hasAutoAppliedAffiliate.current
    ) {
      const affiliateCode =
        Cookies.get(AFFILIATE_TRACKING_COOKIE_KEY) ||
        LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS.map((key) => Cookies.get(key)).find(
          (value) => Boolean(value),
        );
      if (affiliateCode) {
        hasAutoAppliedAffiliate.current = true;
        handleApplyCoupon(affiliateCode);
      }
    }
  }, [itemsPrice, appliedCoupon, firstPurchaseDiscount.loading]);

  // Auto-apply regular coupon from cookie
  const hasAutoAppliedCoupon = useRef(false);
  useEffect(() => {
    if (
      itemsPrice > 0 &&
      !firstPurchaseDiscount.loading &&
      !appliedCoupon &&
      !isApplyingCoupon &&
      !hasAutoAppliedCoupon.current
    ) {
      const couponCode = Cookies.get("coupon_code");
      if (couponCode) {
        // Remove cookie to prevent re-application on refresh
        Cookies.remove("coupon_code", { path: "/" });
        hasAutoAppliedCoupon.current = true;
        handleApplyCoupon(couponCode);
      }
    }
  }, [
    itemsPrice,
    appliedCoupon,
    firstPurchaseDiscount.loading,
    isApplyingCoupon,
  ]);

  // Reset coupon logic
  const resetCoupon = async (message?: string) => {
    setAppliedCoupon(null);
    setCouponError(null);
    await setCartPrices(
      items,
      shippingAddress,
      deliveryDateIndex,
      firstPurchaseDiscount.discountAmount || 0,
    );
    if (message) toast.info(message);
  };

  // Apply coupon logic
  const handleApplyCoupon = async (code?: string) => {
    if (isPlacingOrder || isApplyingCoupon) return;
    const targetCode = (
      typeof code === "string" ? code : couponCode || ""
    ).trim();
    if (!targetCode) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    startTransition(async () => {
      try {
        const result = await validateCoupon(targetCode, itemsPrice);

        if (!result.success || !result.data) {
          setAppliedCoupon(null);
          setCouponError(result.message || "Invalid coupon");
          toast.error(result.message || "Invalid coupon");
          return;
        }

        const { coupon, discount: couponDiscountAmount } = result.data;

        setCouponCode(coupon.code);
        const nextAppliedCoupon = {
          _id: coupon._id,
          code: coupon.code,
          discountType: toDiscountType(coupon.discountType),
          discountAmount: couponDiscountAmount,
        };
        setAppliedCoupon(nextAppliedCoupon);

        const effectiveDiscount = Math.max(
          firstPurchaseDiscount.discountAmount || 0,
          couponDiscountAmount || 0,
        );

        await setCartPrices(
          items,
          shippingAddress,
          deliveryDateIndex,
          effectiveDiscount,
        );

        if (
          (firstPurchaseDiscount.discountAmount || 0) >
          (couponDiscountAmount || 0)
        ) {
          toast.info(
            "Coupon applied, but your first-purchase discount gives better savings and remains active.",
          );
        } else {
          toast.success(result.message || "Coupon applied successfully");
        }
      } catch (error: unknown) {
        setAppliedCoupon(null);
        const message = getErrorMessage(error);
        setCouponError(message);
        toast.error(message);
      } finally {
        setIsApplyingCoupon(false);
      }
    });
  };

  // Shipping address logic
  const onSubmitShippingAddress: SubmitHandler<ShippingAddress> = async (
    values,
  ) => {
    try {
      setIsSubmittingAddress(true);
      await setShippingAddress(values, discount || 0);

      if (saveAddressToAccount && session) {
        const result = await upsertUserAddress({
          ...values,
          label: `Address ${addressBook.length + 1}`,
          saveAsDefault: addressBook.length === 0,
        });

        if (result.success && result.data) {
          const updatedBook = normalizeAddressBookEntries(result.data);
          setAddressBook(updatedBook);
          const selected = updatedBook.find(
            (address) =>
              address.street === values.street &&
              address.postalCode === values.postalCode,
          );
          if (selected) setSelectedSavedAddressId(selected.id);
        }
      }
      setIsAddressSelected(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  // Sync form with selected saved address
  useEffect(() => {
    if (!selectedSavedAddressId) return;
    const selectedAddress = addressBook.find(
      (address) => address.id === selectedSavedAddressId,
    );
    if (!selectedAddress) return;

    const mappedAddress: ShippingAddress = {
      fullName: selectedAddress.fullName,
      street: selectedAddress.street,
      city: selectedAddress.city,
      county: selectedAddress.county,
      phone: selectedAddress.phone,
      postalCode: selectedAddress.postalCode,
      country: selectedAddress.country,
    };

    shippingAddressForm.reset(mappedAddress);
    void setShippingAddress(mappedAddress);
    setIsAddressSelected(true);
  }, [
    addressBook,
    selectedSavedAddressId,
    setShippingAddress,
    shippingAddressForm,
  ]);

  // Sync form with cart shipping address on mount
  useEffect(() => {
    if (!isMounted || !shippingAddress) return;
    if (selectedSavedAddressId) return;
    if (shippingAddress.email)
      shippingAddressForm.setValue("email", shippingAddress.email);
    shippingAddressForm.setValue("fullName", shippingAddress.fullName);
    shippingAddressForm.setValue("street", shippingAddress.street);
    shippingAddressForm.setValue("city", shippingAddress.city);
    shippingAddressForm.setValue("country", shippingAddress.country);
    shippingAddressForm.setValue("postalCode", shippingAddress.postalCode);
    shippingAddressForm.setValue("county", shippingAddress.county);
    shippingAddressForm.setValue("phone", shippingAddress.phone);
  }, [isMounted, selectedSavedAddressId, shippingAddress, shippingAddressForm]);

  // Selection handlers
  const handleSelectPaymentMethod = () => {
    setIsAddressSelected(true);
    setIsPaymentMethodSelected(true);
  };

  const handleSelectShippingAddress = (e?: React.BaseSyntheticEvent) => {
    void shippingAddressForm.handleSubmit(onSubmitShippingAddress, () => {
      toast.error("Please correct the errors in the shipping address form.");
    })(e);
  };

  // Place order logic
  const handlePlaceOrder = async () => {
    if (!items.length) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!shippingAddress || !hasCompleteShippingAddress) {
      toast.error(
        "Please complete your shipping address before placing the order.",
      );
      return;
    }
    if (!session?.user?.email && !shippingAddress.email) {
      toast.error("Please provide a valid email address for order updates.");
      return;
    }
    if (!paymentMethod || !isPaymentMethodSelected) {
      toast.error("Please select and confirm a payment method.");
      return;
    }

    try {
      setIsPlacingOrder(true);
      const defaultDeliveryDateIndex =
        availableDeliveryDates.length > 0
          ? availableDeliveryDates.reduce(
              (fastestIndex, option, index, arr) =>
                option.daysToDeliver < arr[fastestIndex].daysToDeliver
                  ? index
                  : fastestIndex,
              0,
            )
          : 0;

      const res = await createOrder({
        items,
        shippingAddress: shippingAddress!,
        note: note?.trim() || undefined,
        userEmail: shippingAddress?.email || (session?.user?.email as string),
        userName: shippingAddress?.fullName || (session?.user?.name as string),
        expectedDeliveryDate: calculateFutureMinutes(FOOD_DELIVERY_ETA_MINUTES),
        deliveryDateIndex: deliveryDateIndex ?? defaultDeliveryDateIndex,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        taxPrice,
        discount: discount || 0,
        totalPrice,
        coupon: appliedCoupon
          ? {
              _id: appliedCoupon._id,
              code: appliedCoupon.code,
              discountType: appliedCoupon.discountType,
              discountAmount: appliedCoupon.discountAmount,
            }
          : undefined,
      });

      if (!res.success || !res.data) {
        if (res.errors) {
          Object.entries(res.errors).forEach(([field, messages]) => {
            shippingAddressForm.setError(field as keyof ShippingAddress, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(res.message || "Failed to create order");
        return;
      }

      const order = res.data as SerializedOrder;
      const successPath = order.isGuest
        ? `/account/orders/${order._id}/placed?accessToken=${order.accessToken}`
        : `/account/orders/${order._id}/placed`;

      if (order.isGuest && order.accessToken) {
        Cookies.set(`guest_order_access_${order._id}`, order.accessToken, {
          expires: 30,
          sameSite: "lax",
        });
      }

      if (isCardOrMobileMoneyMethod(order.paymentMethod)) {
        setCreatedOrder(order);
        toast.success(
          "Order created. Complete secure payment in the next window.",
        );
      } else {
        clearCart();
        window.location.href = successPath;
      }

      // Subscribe to newsletter if user opted in
      if (acceptMarketingEmails) {
        const email = shippingAddress?.email || session?.user?.email;
        if (email) {
          setIsSubscribing(true);
          await subscribeToNewsletter({
            email,
            source: "checkout",
            tags: ["customer", "checkout"],
          }).catch(() => {});
          setIsSubscribing(false);
        }
      }
    } catch (error: unknown) {
      console.error("Error placing order:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Helper values
  const userCoins =
    liveUserCoins !== null
      ? liveUserCoins
      : Number((session?.user as { coins?: number } | undefined)?.coins ?? 0);

  const userWallet =
    liveUserWallet !== null
      ? liveUserWallet
      : Number(
          (session?.user as { walletBalance?: number } | undefined)
            ?.walletBalance ?? 0,
        );

  const coinsToEarn =
    Math.round(itemsPrice * (common.coinsRewardRate / 100) * 100) / 100;

  const handleCompletePayment = () => {
    if (!createdOrder) return;

    const successPath = createdOrder.isGuest
      ? `/account/orders/${createdOrder._id}/placed?accessToken=${createdOrder.accessToken}`
      : `/account/orders/${createdOrder._id}/placed`;

    clearCart();
    router.push(successPath);
  };

  const handlePaymentFailure = (error?: unknown) => {
    console.error("Payment failure:", error);
    toast.error("Payment was not completed. You can retry from this page.");
  };

  const hasCompleteShippingAddress = useMemo(
    () =>
      REQUIRED_ADDRESS_FIELDS.every((field) =>
        Boolean(shippingAddress?.[field]?.toString().trim()),
      ),
    [shippingAddress],
  );

  const hasGuestEmail = Boolean(
    session?.user?.email || shippingAddress?.email?.trim(),
  );

  const finalAvailablePaymentMethods = useMemo(() => {
    const methods = availablePaymentMethods.filter(
      (method) => method.isPublished !== false,
    );
    if (userCoins >= totalPrice) {
      if (!methods.find((m) => m.name === "Coins")) {
        methods.push({ name: "Coins", commission: 0, isPublished: true });
      }
    }
    if (userWallet >= totalPrice) {
      if (!methods.find((m) => m.name === "Wallet")) {
        methods.push({ name: "Wallet", commission: 0, isPublished: true });
      }
    }
    return methods.filter((m) => m.name !== "BNPL");
  }, [availablePaymentMethods, userCoins, userWallet, totalPrice, session]);

  const isSelectedMethodAvailable = useMemo(
    () => finalAvailablePaymentMethods.some((m) => m.name === paymentMethod),
    [finalAvailablePaymentMethods, paymentMethod],
  );

  const canPlaceOrder =
    !isPlacingOrder &&
    items.length > 0 &&
    isAddressSelected &&
    isPaymentMethodSelected &&
    hasCompleteShippingAddress &&
    hasGuestEmail &&
    Boolean(paymentMethod) &&
    isSelectedMethodAvailable;

  const placeOrderBlockReason = !items.length
    ? "Your cart is empty."
    : !isAddressSelected
      ? "Complete shipping details first."
      : !hasCompleteShippingAddress
        ? "Please complete all required address fields."
        : !hasGuestEmail
          ? "A valid email is required for guest checkout updates."
          : !isPaymentMethodSelected
            ? "Select and confirm a payment method."
            : !paymentMethod
              ? "Select a payment method."
              : null;

  // Update payment method effects
  useEffect(() => {
    if (paymentMethod === "Coins" || paymentMethod === "Wallet") {
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError(null);
    }
  }, [paymentMethod]);

  // Handle invalid or restricted payment method selection
  useEffect(() => {
    if (!isMounted) return;

    const isAvailable = finalAvailablePaymentMethods.some(
      (m) => m.name === paymentMethod,
    );

    if (!isAvailable) {
      const fallback =
        finalAvailablePaymentMethods.find(
          (m) => m.name === defaultPaymentMethod,
        )?.name ||
        finalAvailablePaymentMethods[0]?.name ||
        "";

      if (fallback && fallback !== paymentMethod) {
        setPaymentMethod(fallback);
        setIsPaymentMethodSelected(false);
      }
    }
  }, [
    session,
    finalAvailablePaymentMethods,
    paymentMethod,
    defaultPaymentMethod,
    setPaymentMethod,
    setIsPaymentMethodSelected,
    isMounted,
  ]);

  return {
    // State
    session,
    site,
    common,
    availablePaymentMethods: finalAvailablePaymentMethods,
    availableDeliveryDates,
    items,
    itemsPrice,
    shippingPrice,
    taxPrice,
    discount: discount || 0,
    totalPrice,
    note: note || "",
    shippingAddress,
    deliveryDateIndex,
    paymentMethod,
    couponCode,
    appliedCoupon,
    isApplyingCoupon,
    isSubmittingAddress,
    couponError,
    isPlacingOrder,
    showCouponInput,
    menuItems,
    createdOrder,
    userCoins,
    userWallet,
    coinsToEarn,
    saveAddressToAccount,
    acceptMarketingEmails,
    isSubscribing,
    addressBook,
    selectedSavedAddressId,
    firstPurchaseDiscount,
    effectiveDiscountAmount,
    shippingAddressForm,
    isAddressSelected,
    isPaymentMethodSelected,
    canPlaceOrder,
    placeOrderBlockReason,

    // Actions
    setCouponCode,
    setShowCouponInput,
    setSaveAddressToAccount,
    setAcceptMarketingEmails,
    setSelectedSavedAddressId,
    setPaymentMethod,
    setNote,
    setDeliveryDateIndex,
    updateItem,
    removeItem,
    resetCoupon,
    handleApplyCoupon,
    handlePlaceOrder,
    handleSelectPaymentMethod,
    handleSelectShippingAddress,
    handleCompletePayment,
    handlePaymentFailure,
    setIsAddressSelected,
    setIsPaymentMethodSelected,
  };
};
