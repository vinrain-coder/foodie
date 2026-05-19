import { Metadata } from "next";
import DeliveryLocationForm from "../delivery-location-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Delivery Location",
};

export default function CreateDeliveryLocationPage() {
  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex mb-4">
        <Link href="/restaurant-admin/delivery-locations">Delivery Locations</Link>
        <span className="mx-1">›</span>
        <Link href="/restaurant-admin/delivery-locations/create">Create</Link>
      </div>

      <div className="my-8">
        <DeliveryLocationForm type="Create" />
      </div>
    </main>
  );
}

