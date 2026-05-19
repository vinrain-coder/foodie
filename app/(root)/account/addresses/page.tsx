import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { toSignInPath } from "@/lib/redirects";
import Breadcrumb from "@/components/shared/breadcrumb";
import { normalizeAddressBookEntries } from "@/lib/address-book";
import AddressBook from "./address-book";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingCart } from "lucide-react";

async function page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect(toSignInPath(`/account/addresses${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`));
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <MapPin className="h-7 w-7 text-primary" />
              Your Addresses
            </h1>
            <p className="text-muted-foreground text-sm">
              Save delivery addresses, set your default, and checkout faster.
            </p>
          </div>
          {returnTo && (
            <Badge variant="secondary" className="w-fit">
              <ShoppingCart className="h-3.5 w-3.5" />
              Checkout mode
            </Badge>
          )}
        </div>

        <Card className="border-primary/20 bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {returnTo ? (
              <p>
                Select an address below or add a new one to continue checkout.
                Your selected address will be applied instantly.
              </p>
            ) : (
              <p>
                Keep your delivery details organized with labels like Home, Office,
                or Family. Your default address is auto-selected at checkout.
              </p>
            )}
          </CardContent>
        </Card>

        <AddressBook initialAddresses={normalizeAddressBookEntries(session.user.addresses)} returnTo={returnTo} />
      </div>
    </div>
  );
}

export default page;
