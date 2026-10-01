"use client";

import {
  Plus,
  Users,
  Building2,
  Briefcase,
  CalendarDays,
  Receipt,
  Handshake,
  Upload,
  GraduationCap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Master prompt section 7's global "+ New" menu. Every entry below reuses
// an existing route and existing creation flow (same labels those pages
// already use for their own "+ New X" button) — nothing here is a new
// page. "Lead" is intentionally omitted (Leads & Prospects is deferred per
// approval items 1-3); "Task" is also omitted because, unlike every other
// module, Tasks has no manual creation route at all today — every task row
// is created as a side effect of another action (appointment confirmation,
// follow-up, case closing). Adding a fake one here would be exactly the
// kind of "looks real but isn't" shortcut the master prompt warns against
// for integrations — the same principle applies to a menu item.
export function QuickCreateMenu() {
  const t = useTranslations("Nav");
  const tClients = useTranslations("Clients");
  const tCompanies = useTranslations("Companies");
  const tCases = useTranslations("Cases");
  const tAppointments = useTranslations("Appointments");
  const tInvoices = useTranslations("Invoices");
  const tReferrals = useTranslations("Referrals");
  const tDocuments = useTranslations("Documents");
  const tAcademy = useTranslations("Academy");

  const items = [
    { href: "/clients/new", label: tClients("newClient"), icon: Users },
    { href: "/companies/new", label: tCompanies("newCompany"), icon: Building2 },
    { href: "/cases/new", label: tCases("newCase"), icon: Briefcase },
    { href: "/appointments/new", label: tAppointments("newAppointment"), icon: CalendarDays },
    { href: "/invoices/new", label: tInvoices("newInvoice"), icon: Receipt },
    { href: "/referrals/new", label: tReferrals("newReferral"), icon: Handshake },
    // Documents have no standalone /new route — the existing upload flow
    // lives inline on the Documents cabinet page itself.
    { href: "/documents", label: tDocuments("uploadDocument"), icon: Upload },
    // Same flow the Academy page's own "+ New Student" button already uses.
    { href: "/cases/new?serviceType=academy", label: tAcademy("newStudent"), icon: GraduationCap },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        {t("quickCreate")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.href + item.label} render={<Link href={item.href} />}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
