"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import Link from "next/link";
import { CheckCircle2, Lock, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toSignInPath } from "@/lib/redirects";
import { AddressBookEntry, ShippingAddress } from "@/types";
import { UseFormReturn, Controller, FormProvider } from "react-hook-form";
import type { User as AuthUser } from "better-auth";
import { shippingAddressDefaultValues } from "../utils/checkout-helpers";

interface AddressSectionProps {
  isAddressSelected: boolean;
  shippingAddress: ShippingAddress | undefined;
  session: { user?: AuthUser } | null | undefined;
  addressBook: AddressBookEntry[];
  selectedSavedAddressId: string;
  setSelectedSavedAddressId: (id: string) => void;
  setIsAddressSelected: (selected: boolean) => void;
  setIsPaymentMethodSelected: (selected: boolean) => void;
  shippingAddressForm: UseFormReturn<ShippingAddress>;
  saveAddressToAccount: boolean;
  setSaveAddressToAccount: (save: boolean) => void;
  acceptMarketingEmails: boolean;
  setAcceptMarketingEmails: (accept: boolean) => void;
  isSubscribing: boolean;
  isSubmittingAddress: boolean;
  handleSelectShippingAddress: (e?: React.BaseSyntheticEvent) => void;
}

export const AddressSection = ({
  isAddressSelected,
  shippingAddress,
  session,
  addressBook,
  selectedSavedAddressId,
  setSelectedSavedAddressId,
  setIsAddressSelected,
  setIsPaymentMethodSelected,
  shippingAddressForm,
  saveAddressToAccount,
  setSaveAddressToAccount,
  acceptMarketingEmails,
  setAcceptMarketingEmails,
  isSubscribing,
  isSubmittingAddress,
  handleSelectShippingAddress,
}: AddressSectionProps) => {
  if (isAddressSelected && shippingAddress) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-12 my-3 pb-3">
        <div className="col-span-5 flex text-lg font-bold">
          <span className="w-8">1 </span>
          <span>Shipping address</span>
        </div>
        <div className="col-span-5">
          <p className="max-w-xs">
            {shippingAddress.fullName}{" "}
            {shippingAddress.email ? `( ${shippingAddress.email})` : ""} <br />
            {shippingAddress.street} <br />
            {`${shippingAddress.city}, ${shippingAddress.county}, ${shippingAddress.postalCode}, ${shippingAddress.country}`}
          </p>
        </div>
        <div className="col-span-2">
          <Button
            type="button"
            variant={"outline"}
            onClick={() => {
              setIsAddressSelected(false);
              setIsPaymentMethodSelected(true);
            }}
          >
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex text-primary text-lg font-bold my-2">
        <span className="w-8">1 </span>
        <span>Enter shipping address</span>
      </div>

      {!session && (
        <Card className="md:ml-8 my-4 bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Returning customer?</p>
                  <p className="text-xs text-muted-foreground">
                    Sign in to use your saved addresses and earn rewards.
                  </p>
                </div>
              </div>
              <Link href={toSignInPath("/checkout")}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Sign In
                </Button>
              </Link>
            </div>
            <div className="rounded-lg border border-primary/20 bg-muted p-3 text-xs text-muted-foreground">
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Secure payment processing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Real-time order updates by email
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Checkout without creating an account
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {session && addressBook.length > 0 && (
        <Card className="my-4 overflow-hidden md:ml-8">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Select a saved address
            </div>

            <RadioGroup
              value={selectedSavedAddressId}
              onValueChange={setSelectedSavedAddressId}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {addressBook.map((address) => (
                <div
                  key={address.id}
                  onClick={() => {
                    setSelectedSavedAddressId(address.id);
                    shippingAddressForm.reset({
                      email: address.email,
                      fullName: address.fullName,
                      street: address.street,
                      county: address.county,
                      city: address.city,
                      postalCode: address.postalCode,
                      country: address.country,
                      phone: address.phone,
                    });
                  }}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 transition-all ${
                    selectedSavedAddressId === address.id
                      ? "border-2 border-primary bg-primary/5 shadow-md"
                      : "hover:border-primary/40"
                  }`}
                >
                  <RadioGroupItem
                    value={address.id}
                    id={`saved-address-${address.id}`}
                    className="mt-1 shrink-0"
                  />

                  <Label
                    htmlFor={`saved-address-${address.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-sm leading-relaxed"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-medium">
                        {address.label}
                      </span>

                      {address.isDefault && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="wrap-break-word text-xs sm:text-sm">
                      {address.fullName}
                    </p>

                    <p className="wrap-break-word text-xs sm:text-sm">
                      {address.street}, {address.city}, {address.county},{" "}
                      {address.postalCode}, {address.country}
                    </p>

                    <p className="wrap-break-word text-xs text-muted-foreground">
                      {address.phone}
                    </p>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {addressBook.find((a) => a.id === selectedSavedAddressId) && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                {
                  addressBook.find((a) => a.id === selectedSavedAddressId)
                    ?.label
                }{" "}
                is selected and will be used for delivery.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Link href="/account/addresses?returnTo=/checkout">
                <Button type="button" variant="outline" size="sm">
                  Manage/Add addresses
                </Button>
              </Link>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedSavedAddressId("");
                  setIsAddressSelected(false);
                  shippingAddressForm.reset(shippingAddressDefaultValues);
                }}
              >
                Enter a new address
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <FormProvider {...shippingAddressForm}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSelectShippingAddress(event);
          }}
          className="space-y-4"
        >
          <Card className="md:ml-8 my-4">
            <CardContent className="p-4 space-y-2">
              <div className="text-lg font-bold mb-2">Your address</div>
              {session && (
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox
                    id="saveAddressToAccount"
                    checked={saveAddressToAccount}
                    onCheckedChange={(value) =>
                      setSaveAddressToAccount(Boolean(value))
                    }
                  />
                  <Label htmlFor="saveAddressToAccount">
                    Save this address to my account
                  </Label>
                </div>
              )}

              {!session && (
                <div className="mb-4">
                  <Controller
                    control={shippingAddressForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field
                        className="w-full"
                        data-invalid={fieldState.invalid}
                      >
                        <FieldLabel>Email Address</FieldLabel>

                        <Input
                          placeholder="Enter your email"
                          type="email"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />

                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    We&apos;ll use this email to send you order updates and
                    tracking information.
                  </p>
                </div>
              )}

              {/* Newsletter subscription checkbox */}
              <div className="mb-4">
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <Checkbox
                    id="acceptMarketingEmails"
                    checked={acceptMarketingEmails}
                    onCheckedChange={(value) =>
                      setAcceptMarketingEmails(Boolean(value))
                    }
                    disabled={isSubscribing}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="acceptMarketingEmails"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Send me your newsletter with offers and updates
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By checking this box, you agree to receive marketing
                      emails from us. You can unsubscribe at any time.
                    </p>
                  </div>
                  {isSubscribing && (
                    <span className="text-xs text-muted-foreground italic">
                      Subscribing...
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-5 md:flex-row">
                <Controller
                  control={shippingAddressForm.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Full Name</FieldLabel>

                      <Input
                        placeholder="Enter full name"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={shippingAddressForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Email</FieldLabel>

                      <Input
                        placeholder="Enter your email address"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <div className="flex flex-col gap-5 md:flex-row">
                <Controller
                  control={shippingAddressForm.control}
                  name="street"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Address</FieldLabel>

                      <Input
                        placeholder="Enter address"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={shippingAddressForm.control}
                  name="street"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Street</FieldLabel>

                      <Input
                        placeholder="Enter street name"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <div className="flex flex-col gap-5 md:flex-row">
                <Controller
                  control={shippingAddressForm.control}
                  name="county"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>County</FieldLabel>

                      <Input
                        placeholder="Enter county"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={shippingAddressForm.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>City</FieldLabel>

                      <Input
                        placeholder="Enter city"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={shippingAddressForm.control}
                  name="country"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Country</FieldLabel>

                      <Input
                        placeholder="Enter country"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <div className="flex flex-col gap-5 md:flex-row">
                <Controller
                  control={shippingAddressForm.control}
                  name="postalCode"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Postal Code</FieldLabel>

                      <Input
                        placeholder="Enter postal code"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={shippingAddressForm.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field className="w-full" data-invalid={fieldState.invalid}>
                      <FieldLabel>Phone number</FieldLabel>

                      <Input
                        placeholder="Enter phone number"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="p-4">
              <Button
                type="submit"
                className="rounded-full font-bold cursor-pointer"
                disabled={isSubmittingAddress}
              >
                {isSubmittingAddress
                  ? "Saving address..."
                  : "Ship to this address"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>
    </>
  );
};
