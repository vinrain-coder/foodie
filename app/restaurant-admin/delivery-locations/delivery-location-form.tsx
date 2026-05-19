"use client";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, Controller, FormProvider, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  createDeliveryLocation,
  createDeliveryLocationsBulk,
  getAllCounties,
  updateDeliveryLocation,
  SerializedDeliveryLocation,
} from "@/lib/actions/delivery-location.actions";
import {
  DeliveryLocationInputSchema,
  DeliveryLocationUpdateSchema,
} from "@/lib/validator";
import { toast } from "sonner";
import SubmitButton from "@/components/shared/submit-button";
import { FormError } from "@/components/shared/form-error";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

const deliveryLocationDefaultValues = {
  county: "",
  city: "",
  rate: 0,
};

const DeliveryLocationForm = ({
  type,
  deliveryLocation,
  deliveryLocationId,
}: {
  type: "Create" | "Update";
  deliveryLocation?: SerializedDeliveryLocation;
  deliveryLocationId?: string;
}) => {
  const router = useRouter();

  const [counties, setCounties] = useState<string[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(true);

  const [countyMode, setCountyMode] = useState<"existing" | "new">("existing");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [newCounty, setNewCounty] = useState("");

  const [countySearch, setCountySearch] = useState("");

  const [bulkPlaces, setBulkPlaces] = useState([{ city: "", rate: "" }]);

  type DeliveryLocationFormValues = z.infer<typeof DeliveryLocationInputSchema>;

  const form = useForm<DeliveryLocationFormValues>({
    resolver: zodResolver(
      type === "Update"
        ? DeliveryLocationUpdateSchema
        : DeliveryLocationInputSchema,
    ) as Resolver<DeliveryLocationFormValues>,
    defaultValues:
      deliveryLocation && type === "Update"
        ? deliveryLocation
        : deliveryLocationDefaultValues,
  });

  useEffect(() => {
    if (type !== "Create") return;

    setLoadingCounties(true);
    getAllCounties()
      .then((data) => {
        setCounties(data);
        if (data.length > 0) setSelectedCounty(data[0]);
        else setCountyMode("new");
      })
      .catch(() => toast.error("Failed to load counties"))
      .finally(() => setLoadingCounties(false));
  }, [type]);

  const filteredCounties = useMemo(() => {
    return counties.filter((c) =>
      c.toLowerCase().includes(countySearch.toLowerCase()),
    );
  }, [counties, countySearch]);

  async function onSubmit(values: DeliveryLocationFormValues) {
    let res;

    if (type === "Create") {
      res = await createDeliveryLocation(values);
    } else {
      if (!deliveryLocationId) {
        router.push(`/restaurant-admin/delivery-locations`);
        return;
      }

      res = await updateDeliveryLocation({
        ...values,
        _id: deliveryLocationId,
      });
    }

    if (res.success) {
      toast.success(res.message);
      router.push(`/restaurant-admin/delivery-locations`);
    } else {
      if (res.errors) {
        Object.entries(res.errors).forEach(([field, messages]) => {
          form.setError(field as any, {
            type: "server",
            message: messages.join(". "),
          });
        });
      }
      toast.error(res.message || "Failed to save delivery location");
    }
  }

  async function onBulkSubmit() {
    const county =
      countyMode === "new" ? newCounty.trim() : selectedCounty.trim();

    const places = bulkPlaces
      .map((p) => ({
        city: p.city.trim(),
        rate: Number(p.rate),
      }))
      .filter(
        (p) => p.city.length > 0 && Number.isFinite(p.rate) && p.rate >= 0,
      );

    if (!county) {
      toast.error("Please select or enter a county");
      return;
    }

    if (!places.length) {
      toast.error("Add at least one valid place");
      return;
    }

    // 🚫 Prevent duplicates
    const seen = new Set();
    for (const p of places) {
      const key = p.city.toLowerCase();
      if (seen.has(key)) {
        toast.error(`Duplicate place: ${p.city}`);
        return;
      }
      seen.add(key);
    }

    const res = await createDeliveryLocationsBulk({ county, places });

    if (res.success) {
      toast.success(res.message);
      router.push(`/restaurant-admin/delivery-locations`);
    } else {
      toast.error(res.message);
    }
  }

  const isBulkValid =
    (countyMode === "new" ? newCounty : selectedCounty) &&
    bulkPlaces.some(
      (p) => p.city.trim() && Number(p.rate) >= 0 && p.rate !== "",
    );

  if (type === "Create") {
    return (
      <div className="w-full max-w-2xl space-y-6 rounded-lg border bg-card p-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold">Add delivery places</h2>
          <p className="text-sm text-muted-foreground">
            Add multiple places under one county quickly.
          </p>
        </div>

        {/* County Mode */}
        <div className="space-y-2">
          <Label>County Mode</Label>
          <div className="flex gap-2">
            <Button
              variant={countyMode === "existing" ? "default" : "outline"}
              onClick={() => setCountyMode("existing")}
            >
              Existing
            </Button>
            <Button
              variant={countyMode === "new" ? "default" : "outline"}
              onClick={() => setCountyMode("new")}
            >
              New
            </Button>
          </div>
        </div>

        {/* County Input */}
        {countyMode === "existing" ? (
          <div className="space-y-2">
            <Label>Select County</Label>

            <Input
              placeholder="Search county..."
              value={countySearch}
              onChange={(e) => setCountySearch(e.target.value)}
            />

            <div className="max-h-40 overflow-y-auto border rounded-md">
              {loadingCounties ? (
                <p className="p-2 text-sm text-muted-foreground">Loading...</p>
              ) : filteredCounties.length > 0 ? (
                filteredCounties.map((county) => (
                  <div
                    key={county}
                    onClick={() => setSelectedCounty(county)}
                    className={`px-3 py-2 cursor-pointer hover:bg-muted ${
                      selectedCounty === county ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {county}
                  </div>
                ))
              ) : (
                <p className="p-2 text-sm text-muted-foreground">
                  No counties found
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>New County</Label>
            <Input
              placeholder="e.g. Nairobi"
              value={newCounty}
              onChange={(e) => setNewCounty(e.target.value)}
            />
          </div>
        )}

        {/* Bulk Places */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Places & Rates</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setBulkPlaces((prev) => [...prev, { city: "", rate: "" }])
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {bulkPlaces.map((place, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              <div className="col-span-7">
                <Input
                  placeholder="Place name"
                  value={place.city}
                  onChange={(e) =>
                    setBulkPlaces((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, city: e.target.value } : row,
                      ),
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setBulkPlaces((prev) => [
                        ...prev,
                        { city: "", rate: "" },
                      ]);
                    }
                  }}
                />
              </div>

              <div className="col-span-4">
                <Input
                  type="number"
                  placeholder="Rate"
                  min={0}
                  value={place.rate}
                  onChange={(e) =>
                    setBulkPlaces((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, rate: e.target.value } : row,
                      ),
                    )
                  }
                />
                {place.rate !== "" && Number(place.rate) < 0 && (
                  <p className="text-xs text-red-500">Must be ≥ 0</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="col-span-1"
                onClick={() =>
                  setBulkPlaces((prev) =>
                    prev.length === 1
                      ? prev
                      : prev.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="text-sm text-muted-foreground">
          {bulkPlaces.length} places will be added to{" "}
          <span className="font-medium">
            {countyMode === "new" ? newCounty : selectedCounty}
          </span>
        </div>

        {/* Submit */}
        <SubmitButton
          isLoading={false}
          disabled={!isBulkValid}
          loadingText="Saving..."
          size="lg"
          onClick={onBulkSubmit}
        >
          Save all places
        </SubmitButton>
      </div>
    );
  }

  // UPDATE MODE (unchanged but clean)
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-lg"
      >
        <Controller
          control={form.control}
          name="county"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>County</FieldLabel>
              
                <Input aria-invalid={fieldState.invalid} {...field} />
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="city"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Place</FieldLabel>
              
                <Input aria-invalid={fieldState.invalid} {...field} />
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="rate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Rate</FieldLabel>
              
                <Input type="number" aria-invalid={fieldState.invalid} {...field} />
              
              <FieldError  errors={[fieldState.error]} />
            </Field>
          )}
        />

        <FormError message={form.formState.errors.root?.message} />

        <SubmitButton
          isLoading={form.formState.isSubmitting}
          loadingText="Updating..."
          size="lg"
        >
          Update Location
        </SubmitButton>
      </form>
    </FormProvider>
  );
};

export default DeliveryLocationForm;

