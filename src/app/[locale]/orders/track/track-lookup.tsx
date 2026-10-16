"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { OrderView } from "@/components/store/order-view";
import { api, errorMessage, fieldErrors } from "@/lib/client/api";
import type { CustomerOrderDTO } from "@/lib/types";
import { useT } from "@/i18n/client";

export function TrackLookup() {
  const t = useT();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<CustomerOrderDTO | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      setOrder(await api<CustomerOrderDTO>("/api/orders/track", { body: { orderNumber, email } }));
    } catch (err) {
      setError(errorMessage(err));
      setFields(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  if (order) {
    return (
      <div>
        <button type="button" onClick={() => setOrder(null)} className="mb-6 text-sm font-semibold text-brand hover:underline">
          ← {t("track.lookupAnother")}
        </button>
        <OrderView order={order} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-lg space-y-5 rounded-[1.5rem] border border-line bg-paper p-6 sm:p-8">
      <FormError message={error} />
      <Field id="t-num" label={t("track.orderNumber")} required error={fields.orderNumber} hint={t("track.orderNumberHint")}>
        <Input id="t-num" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="FF-" autoComplete="off" invalid={!!fields.orderNumber} />
      </Field>
      <Field id="t-email" label={t("track.email")} required error={fields.email}>
        <Input id="t-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fields.email} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={busy} icon={<Search className="h-4 w-4" />}>
        {t("track.find")}
      </Button>
    </form>
  );
}
