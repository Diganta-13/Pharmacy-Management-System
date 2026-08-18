import { redirect } from "next/navigation";

export default function PharmacistPurchasePage() {
  redirect("/pharmacist/low-stock-alerts");
}