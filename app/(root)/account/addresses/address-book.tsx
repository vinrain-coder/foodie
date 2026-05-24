"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { useMemo, useState, useTransition } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AddressBookEntry } from "@/types";
import { AddressBookInputSchema } from "@/lib/validator";
import {
  removeUserAddress,
  setDefaultUserAddress,
  upsertUserAddress,
} from "@/lib/actions/address.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/components/shared/form-error";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AddressBookFormInput = z.input<typeof AddressBookInputSchema>;
type AddressBookFormOutput = z.output<typeof AddressBookInputSchema>;

const emptyAddress: AddressBookFormInput = {
  label: "",
  fullName: "",
  street: "",
  city: "",
  county: "",
  postalCode: "",
  country: "Kenya",
  phone: "",
  saveAsDefault: false,
};

export default function AddressBook({
  initialAddresses,
  returnTo,
}: {
  initialAddresses: AddressBookEntry[];
  returnTo?: string;
}) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeDefaultAddressId, setActiveDefaultAddressId] = useState<
    string | null
  >(null);
  const [activeRemoveAddressId, setActiveRemoveAddressId] = useState<
    string | null
  >(null);

  const form = useForm<AddressBookFormInput, unknown, AddressBookFormOutput>({
    resolver: zodResolver(AddressBookInputSchema),
    defaultValues: emptyAddress,
  });

  const orderedAddresses = useMemo(
    () =>
      [...addresses].sort((a, b) => {
        if (a.isDefault === b.isDefault) return 0;
        return a.isDefault ? -1 : 1;
      }),
    [addresses],
  );
  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault),
    [addresses],
  );
  const isCheckoutMode = Boolean(returnTo);

  const editingAddress = useMemo(
    () => addresses.find((item) => item.id === editingAddressId),
    [addresses, editingAddressId],
  );

  const handleEdit = (address: AddressBookEntry) => {
    setEditingAddressId(address.id);
    form.reset({
      label: address.label,
      fullName: address.fullName,
      street: address.street,
      city: address.city,
      county: address.county,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      saveAsDefault: address.isDefault,
    });
  };

  const clearForm = () => {
    setEditingAddressId(null);
    form.reset(emptyAddress);
  };

  const onSubmit = (values: AddressBookFormOutput) => {
    startTransition(async () => {
      const result = await upsertUserAddress(values, {
        addressId: editingAddressId ?? undefined,
      });

      if (!result.success || !result.data) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            form.setError(field as keyof AddressBookFormInput, {
              type: "server",
              message: messages.join(". "),
            });
          });
        }
        toast.error(result.message || "Failed to save address");
        return;
      }

      setAddresses(result.data);
      toast.success(result.message || "Address saved");

      if (returnTo) {
        const savedAddressId =
          editingAddressId || result.data[result.data.length - 1]?.id;

        router.push(
          savedAddressId
            ? `${returnTo}?selectedAddressId=${encodeURIComponent(savedAddressId)}`
            : returnTo,
        );
        return;
      }

      clearForm();
    });
  };

  const handleSetDefault = (addressId: string) => {
    startTransition(async () => {
      setActiveDefaultAddressId(addressId);
      const result = await setDefaultUserAddress(addressId);
      if (!result.success || !result.data) {
        toast.error(result.message || "Failed to set default address");
        setActiveDefaultAddressId(null);
        return;
      }
      setAddresses(result.data);
      setActiveDefaultAddressId(null);
      toast.success("Default address updated");
    });
  };

  const handleRemoveAddress = (addressId: string) => {
    startTransition(async () => {
      setActiveRemoveAddressId(addressId);
      const result = await removeUserAddress(addressId);
      if (!result.success || !result.data) {
        toast.error(result.message || "Failed to remove address");
        setActiveRemoveAddressId(null);
        return;
      }
      setAddresses(result.data);
      if (editingAddressId === addressId) clearForm();
      setActiveRemoveAddressId(null);
      toast.success("Address removed");
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Saved addresses</p>
              <p className="text-lg font-semibold">{addresses.length}</p>
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Default address</p>
              <p className="text-sm font-semibold truncate">
                {defaultAddress?.label || "Not set"}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <p className="text-xs text-muted-foreground">Checkout status</p>
              <p className="text-sm font-semibold">
                {isCheckoutMode ? "Selecting address" : "Address book mode"}
              </p>
            </CardContent>
          </Card>
        </div>

        {addresses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2 text-foreground font-medium">
                <PlusCircle className="h-4 w-4 text-primary" />
                No saved addresses yet
              </p>
              <p className="mt-1">
                Add your first delivery address using the form on this page.
              </p>
            </CardContent>
          </Card>
        ) : (
          orderedAddresses.map((address) => (
            <Card
              key={address.id}
              className={cn(
                "transition-colors",
                address.isDefault && "border-primary/40 bg-primary/5",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="inline-flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{address.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {address.isDefault && (
                      <Badge className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                    {isCheckoutMode && (
                      <Badge variant="secondary" className="text-[10px]">
                        Checkout
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <div className="space-y-0.5 text-foreground/90">
                  <p className="font-medium">{address.fullName}</p>
                  <p>{address.street}</p>
                  <p>
                    {address.city}, {address.county} {address.postalCode}
                  </p>
                  <p>{address.country}</p>
                  <p>{address.phone}</p>
                </div>

                {address.isDefault && (
                  <p className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Automatically used at checkout unless you change it.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {isCheckoutMode && (
                    <Link
                      href={`${returnTo}?selectedAddressId=${encodeURIComponent(address.id)}`}
                      className="inline-flex"
                    >
                      <Button size="sm">Use this address</Button>
                    </Link>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(address)}
                    className="inline-flex items-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  {!address.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleSetDefault(address.id)}
                      className="inline-flex items-center gap-1"
                    >
                      {activeDefaultAddressId === address.id ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                          Updating...
                        </span>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Set default
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleRemoveAddress(address.id)}
                    className="inline-flex items-center gap-1"
                  >
                    {activeRemoveAddressId === address.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Removing...
                      </span>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="lg:sticky lg:top-24 h-fit">
        <CardHeader>
          <CardTitle>
            {editingAddress
              ? `Edit address: ${editingAddress.label}`
              : "Add a new address"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {editingAddress
              ? "Update this address and save your changes."
              : "Fill in details once and reuse this address at checkout."}
          </p>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Controller
                  control={form.control}
                  name="label"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Label</FieldLabel>

                      <Input
                        placeholder="Home, Office, Family..."
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="fullName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Full name</FieldLabel>

                      <Input
                        placeholder="e.g. Jane Wanjiku"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Phone number</FieldLabel>

                      <Input
                        placeholder="e.g. 0712345678"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="country"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Country</FieldLabel>

                      <Input
                        placeholder="Kenya"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="county"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>County</FieldLabel>
                      <Input
                        placeholder="e.g. Nairobi"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>City</FieldLabel>
                      <Input
                        placeholder="e.g. Kasarani"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="street"
                  render={({ field, fieldState }) => (
                    <Field
                      className="sm:col-span-2"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel>Street address</FieldLabel>

                      <Input
                        placeholder="e.g. TRM Drive, House 13"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="postalCode"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Postal code</FieldLabel>

                      <Input
                        placeholder="e.g. 00100"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />

                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <FormError message={form.formState.errors.root?.message} />

              <Controller
                control={form.control}
                name="saveAsDefault"
                render={({ field, fieldState }) => (
                  <Field
                    className="flex flex-row items-center gap-3 space-y-0 rounded-xl border bg-muted/20 p-3"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(Boolean(checked))
                      }
                    />

                    <div className="space-y-0.5">
                      <FieldLabel className="cursor-pointer">
                        Set as default address
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground">
                        This address will be preselected at checkout.
                      </p>
                    </div>
                  </Field>
                )}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : editingAddress ? (
                    "Update address"
                  ) : (
                    "Save address"
                  )}
                </Button>

                {editingAddress && (
                  <Button type="button" variant="outline" onClick={clearForm}>
                    Add new instead
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
