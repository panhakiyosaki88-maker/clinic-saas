import { redirect } from "next/navigation";

export default function BillingSettingsIndex() {
  redirect("/settings/billing/catalog");
}
