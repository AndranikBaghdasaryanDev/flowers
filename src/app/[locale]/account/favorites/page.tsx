import type { Metadata } from "next";
import { connection } from "next/server";
import { Heart } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getStoreI18n } from "@/i18n/server";
import { getFavoriteIds } from "@/lib/services/account";
import { getProductsByIds } from "@/lib/services/catalog";
import { ProductGrid } from "@/components/store/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getStoreI18n();
  return { title: t("account.nav.favorites") };
}
export const instant = false;

export default async function FavoritesPage() {
  await connection();
  const user = await requirePageUser("/account/favorites");
  const products = await getProductsByIds(await getFavoriteIds(user.id));
  const { t } = await getStoreI18n();
  return (
    <div>
      <h1 className="mb-6 font-display text-[2.4rem] leading-tight text-ink">{t("account.nav.favorites")}</h1>
      {products.length ? (
        <ProductGrid products={products} columns={3} />
      ) : (
        <EmptyState icon={<Heart className="h-6 w-6" />} title={t("account.favorites.emptyTitle")} description={t("account.favorites.emptyText")} action={<LinkButton href="/shop">{t("account.favorites.browse")}</LinkButton>} />
      )}
    </div>
  );
}
