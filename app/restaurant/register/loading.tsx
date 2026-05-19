import { Loader2 } from "lucide-react";

export default function LoadingRestaurantRegister() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
