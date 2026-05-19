"use client";

import { Heart } from "lucide-react";
import { useWishlistToggle } from "@/hooks/useWishlistToggle";

interface WishlistIconProps {
  menuItemId: string;
  initialInWishlist?: boolean;
}

const WishlistIcon: React.FC<WishlistIconProps> = ({
  menuItemId,
  initialInWishlist = false,
}) => {
  const { inWishlist, toggleWishlist, pending } = useWishlistToggle(
    menuItemId,
    initialInWishlist,
  );

  return (
    <button
      onClick={toggleWishlist}
      disabled={pending}
      className={`p-1.5 rounded-full shadow-lg transition cursor-pointer ${
        inWishlist
          ? "bg-background hover:bg-background/80"
          : "bg-white hover:bg-gray-100"
      }`}
      title="Add to Wishlist"
    >
      <Heart
        className={`transition ${
          inWishlist ? "fill-rose-500 text-rose-500" : "text-gray-700"
        }`}
        size={16}
      />
    </button>
  );
};

export default WishlistIcon;
