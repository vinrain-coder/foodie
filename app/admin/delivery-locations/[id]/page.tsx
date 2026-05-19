import { Metadata } from "next";
import { notFound } from "next/navigation";
import DeliveryLocationForm from "../delivery-location-form";
import { getDeliveryLocationById } from "@/lib/actions/delivery-location.actions";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Update Delivery Location",
};

type UpdateDeliveryLocationProps = {
  params: Promise<{ id: string }>;
};

const UpdateDeliveryLocationPage = async (
  props: UpdateDeliveryLocationProps,
) => {
  const { id } = await props.params;

  const deliveryLocation = await getDeliveryLocationById(id);

  if (!deliveryLocation) notFound();

  return (
    <main className="max-w-6xl mx-auto p-4">
      {/* Breadcrumb */}
      <div className="flex mb-4">
        <Link href="/admin/delivery-locations">Delivery Locations</Link>
        <span className="mx-1">›</span>
        <Link href={`/admin/delivery-locations/${deliveryLocation._id}`}>
          {deliveryLocation._id.toString()}
        </Link>
      </div>

      {/* Form Section */}
      <div className="my-8">
        <DeliveryLocationForm
          type="Update"
          deliveryLocation={deliveryLocation}
          deliveryLocationId={id}
        />
      </div>
    </main>
  );
};

export default UpdateDeliveryLocationPage;
