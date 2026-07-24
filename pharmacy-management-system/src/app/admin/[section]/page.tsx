import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ChartNoAxesColumnIncreasing,
  CircleAlert,
  ClipboardPlus,
  Package,
  Settings,
  Tags,
  UserRoundCog,
} from "lucide-react";
import { notFound } from "next/navigation";

type SectionConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const sectionPages: Record<string, SectionConfig> = {
  categories: {
    title: "Medicine Categories",
    description:
      "Create, update and manage medicine categories from this section.",
    icon: Tags,
  },
  stock: {
    title: "Stock Management",
    description:
      "Check available stock, stock quantities and inventory movements.",
    icon: Boxes,
  },
  purchase: {
    title: "Purchase Management",
    description:
      "Record medicine purchases and manage supplier purchase invoices.",
    icon: ClipboardPlus,
  },
  employees: {
    title: "Employee Management",
    description:
      "Add employees, update employee information and control account access.",
    icon: UserRoundCog,
  },
  reports: {
    title: "Reports",
    description:
      "View sales, purchase, medicine, customer and inventory reports.",
    icon: ChartNoAxesColumnIncreasing,
  },
  "expiry-alerts": {
    title: "Expiry Alerts",
    description:
      "Review medicines that have expired or will expire within the configured period.",
    icon: CircleAlert,
  },
  "low-stock-alerts": {
    title: "Low Stock Alerts",
    description:
      "Review medicines that are below their minimum required stock level.",
    icon: Package,
  },
  settings: {
    title: "Settings",
    description:
      "Configure pharmacy information, system preferences and account settings.",
    icon: Settings,
  },
};

type AdminSectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export default async function AdminSectionPage({
  params,
}: AdminSectionPageProps) {
  const { section } = await params;
  const page = sectionPages[section];

  if (!page) {
    notFound();
  }

  const Icon = page.icon;

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <Icon className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              {page.title}
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {page.description}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            This page is ready for implementation
          </p>

          <p className="mt-1 text-xs text-slate-500">
            The sidebar route is working correctly.
          </p>
        </div>
      </div>
    </div>
  );
}