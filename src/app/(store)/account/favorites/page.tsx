import type { Metadata } from "next";
import { connection } from "next/server";
import { Heart } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getFavoriteIds } from "@/lib/services/account";
import { getProductsByIds } from "@/lib/services/catalog";
import { ProductGrid } from "@/components/store/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Favourites" };
export const instant = false;

export default async function FavoritesPage() {
  await connection();
  const user = await requirePageUser("/account/favorites");
  const products = await getProductsByIds(await getFavoriteIds(user.id));
  return (
    <div>
      <h1 className="mb-6 font-display text-[2.4rem] leading-tight text-ink">Favourites</h1>
      {products.length ? (
        <ProductGrid products={products} columns={3} />
      ) : (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No favourites yet" description="Tap the heart on any bouquet to keep it here for later." action={<LinkButton href="/shop">Browse flowers</LinkButton>} />
      )}
    </div>
  );
}
