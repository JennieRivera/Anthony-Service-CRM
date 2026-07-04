import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import {
  clients,
  cases,
  appointments,
  invoices,
  invoiceLineItems,
  notaryLogEntries,
  apostilleDetails,
} from "../src/lib/db/schema";

config({ path: ".env.local" });

const SEED_TAG = "[SEED DATA]";

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const db = getDb();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(clients);

  if (count > 0) {
    console.log(
      `clients table already has ${count} row(s) — skipping seed. Run scripts/unseed.ts first if you want to reseed.`,
    );
    return;
  }

  console.log("Seeding sample data...");

  const clientRows = await db
    .insert(clients)
    .values([
      {
        fullName: "Maria Gonzalez",
        email: "maria.gonzalez@example.com",
        phone: "(407) 555-0101",
        preferredLanguage: "es",
        status: "active",
        referralSource: "Referido de cliente",
        interestedServices: ["notary"],
        notes: SEED_TAG,
      },
      {
        fullName: "Carlos Mendoza",
        email: "carlos.mendoza@example.com",
        phone: "(407) 555-0102",
        preferredLanguage: "es",
        status: "in_progress",
        referralSource: "Google",
        interestedServices: ["mobile_notary"],
        notes: SEED_TAG,
      },
      {
        fullName: "Jennifer Smith",
        email: "jennifer.smith@example.com",
        phone: "(407) 555-0103",
        preferredLanguage: "en",
        status: "lead",
        referralSource: "Facebook",
        interestedServices: ["online_notary"],
        notes: SEED_TAG,
      },
      {
        fullName: "Luis Fernandez",
        email: "luis.fernandez@example.com",
        phone: "(407) 555-0104",
        preferredLanguage: "es",
        status: "completed",
        referralSource: "Walk-in",
        interestedServices: ["immigration"],
        notes: SEED_TAG,
      },
      {
        fullName: "Ashley Rodriguez",
        email: "ashley.rodriguez@example.com",
        phone: "(407) 555-0105",
        preferredLanguage: "en",
        status: "active",
        referralSource: "Google",
        interestedServices: ["tax_prep"],
        notes: SEED_TAG,
      },
      {
        fullName: "Roberto Diaz",
        email: "roberto.diaz@example.com",
        phone: "(407) 555-0106",
        preferredLanguage: "es",
        status: "follow_up",
        referralSource: "Referido de cliente",
        interestedServices: ["immigration", "apostille"],
        notes: SEED_TAG,
      },
      {
        fullName: "Michael Johnson",
        email: "michael.johnson@example.com",
        phone: "(407) 555-0107",
        preferredLanguage: "en",
        status: "active",
        referralSource: "Website",
        interestedServices: ["document_prep"],
        notes: SEED_TAG,
      },
      {
        fullName: "Yolanda Perez",
        email: "yolanda.perez@example.com",
        phone: "(407) 555-0108",
        preferredLanguage: "es",
        status: "lead",
        referralSource: "Facebook",
        interestedServices: ["credit_financing"],
        notes: SEED_TAG,
      },
      {
        fullName: "David Martinez",
        email: "david.martinez@example.com",
        phone: "(407) 555-0109",
        preferredLanguage: "en",
        status: "in_progress",
        referralSource: "Walk-in",
        interestedServices: ["tax_prep"],
        notes: SEED_TAG,
      },
      {
        fullName: "Carmen Ruiz",
        email: "carmen.ruiz@example.com",
        phone: "(407) 555-0110",
        preferredLanguage: "es",
        status: "completed",
        referralSource: "Google",
        interestedServices: ["credit_financing"],
        notes: SEED_TAG,
      },
      {
        fullName: "Kevin Torres",
        email: "kevin.torres@example.com",
        phone: "(407) 555-0111",
        preferredLanguage: "en",
        status: "active",
        referralSource: "Referido de cliente",
        interestedServices: ["apostille"],
        notes: SEED_TAG,
      },
      {
        fullName: "Patricia Ortiz",
        email: "patricia.ortiz@example.com",
        phone: "(407) 555-0112",
        preferredLanguage: "es",
        status: "follow_up",
        referralSource: "Website",
        interestedServices: ["notary", "document_prep"],
        notes: SEED_TAG,
      },
    ])
    .returning();

  const byName = (name: string) => {
    const client = clientRows.find((c) => c.fullName === name);
    if (!client) throw new Error(`Seed client not found: ${name}`);
    return client;
  };

  const caseRows = await db
    .insert(cases)
    .values([
      {
        clientId: byName("Maria Gonzalez").id,
        serviceType: "notary",
        status: "completed",
        title: "Power of attorney notarization",
        fee: "45.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Carlos Mendoza").id,
        serviceType: "mobile_notary",
        status: "in_progress",
        title: "Mobile notary for home closing",
        dueDate: dateOnly(daysFromNow(5)),
        fee: "125.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Jennifer Smith").id,
        serviceType: "online_notary",
        status: "new",
        title: "Remote online notarization — rental agreement",
        fee: "35.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Luis Fernandez").id,
        serviceType: "immigration",
        status: "completed",
        title: "Green card renewal",
        fee: "650.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Roberto Diaz").id,
        serviceType: "immigration",
        status: "waiting_on_client",
        title: "Family-based petition",
        dueDate: dateOnly(daysFromNow(14)),
        fee: "800.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Ashley Rodriguez").id,
        serviceType: "tax_prep",
        status: "in_progress",
        title: "2025 personal tax return",
        dueDate: dateOnly(daysFromNow(20)),
        fee: "150.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("David Martinez").id,
        serviceType: "tax_prep",
        status: "new",
        title: "Small business tax return",
        dueDate: dateOnly(daysFromNow(25)),
        fee: "350.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Roberto Diaz").id,
        serviceType: "apostille",
        status: "waiting_on_client",
        title: "Birth certificate apostille",
        fee: "95.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Kevin Torres").id,
        serviceType: "apostille",
        status: "completed",
        title: "University diploma apostille",
        fee: "95.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Michael Johnson").id,
        serviceType: "document_prep",
        status: "in_progress",
        title: "LLC formation documents",
        fee: "275.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Patricia Ortiz").id,
        serviceType: "document_prep",
        status: "new",
        title: "Lease agreement preparation",
        fee: "80.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Yolanda Perez").id,
        serviceType: "credit_financing",
        status: "in_progress",
        title: "Credit repair program enrollment",
        fee: "199.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Carmen Ruiz").id,
        serviceType: "credit_financing",
        status: "completed",
        title: "Business loan application",
        fee: "500.00",
        notes: SEED_TAG,
      },
      {
        clientId: byName("Patricia Ortiz").id,
        serviceType: "notary",
        status: "cancelled",
        title: "Affidavit notarization",
        fee: "35.00",
        notes: SEED_TAG,
      },
    ])
    .returning();

  const byTitle = (title: string) => {
    const c = caseRows.find((row) => row.title === title);
    if (!c) throw new Error(`Seed case not found: ${title}`);
    return c;
  };

  await db.insert(appointments).values([
    {
      clientId: byName("Carlos Mendoza").id,
      caseId: byTitle("Mobile notary for home closing").id,
      title: "Mobile notary — home closing signing",
      serviceType: "mobile_notary",
      startAt: daysFromNow(5),
      endAt: daysFromNow(5),
      location: "Client residence, Kissimmee FL",
      status: "scheduled",
      notes: SEED_TAG,
    },
    {
      clientId: byName("Jennifer Smith").id,
      caseId: byTitle("Remote online notarization — rental agreement").id,
      title: "Online notarization session",
      serviceType: "online_notary",
      startAt: daysFromNow(2),
      endAt: daysFromNow(2),
      location: "Remote (video call)",
      status: "scheduled",
      notes: SEED_TAG,
    },
    {
      clientId: byName("Ashley Rodriguez").id,
      caseId: byTitle("2025 personal tax return").id,
      title: "Tax document review",
      serviceType: "tax_prep",
      startAt: daysFromNow(7),
      endAt: daysFromNow(7),
      location: "Office — 2610 Orchid Ln",
      status: "scheduled",
      notes: SEED_TAG,
    },
    {
      clientId: byName("Maria Gonzalez").id,
      caseId: byTitle("Power of attorney notarization").id,
      title: "Notary signing — power of attorney",
      serviceType: "notary",
      startAt: daysFromNow(-10),
      endAt: daysFromNow(-10),
      location: "Office — 2610 Orchid Ln",
      status: "completed",
      notes: SEED_TAG,
    },
    {
      clientId: byName("Patricia Ortiz").id,
      title: "Walk-in consultation",
      serviceType: "notary",
      startAt: daysFromNow(-3),
      endAt: daysFromNow(-3),
      location: "Office — 2610 Orchid Ln",
      status: "no_show",
      notes: SEED_TAG,
    },
    {
      clientId: byName("Yolanda Perez").id,
      caseId: byTitle("Credit repair program enrollment").id,
      title: "Credit repair intake consultation",
      serviceType: "credit_financing",
      startAt: daysFromNow(3),
      endAt: daysFromNow(3),
      location: "Office — 2610 Orchid Ln",
      status: "scheduled",
      notes: SEED_TAG,
    },
  ]);

  const invoiceSeed: Array<{
    clientName: string;
    caseTitle?: string;
    status: "unpaid" | "paid" | "overdue" | "cancelled";
    issueDaysAgo: number;
    dueDaysFromIssue: number;
    paid: boolean;
    items: Array<{ description: string; quantity: string; unitPrice: string }>;
  }> = [
    {
      clientName: "Maria Gonzalez",
      caseTitle: "Power of attorney notarization",
      status: "paid",
      issueDaysAgo: 10,
      dueDaysFromIssue: 7,
      paid: true,
      items: [
        { description: "Notarization — power of attorney", quantity: "1", unitPrice: "45.00" },
      ],
    },
    {
      clientName: "Luis Fernandez",
      caseTitle: "Green card renewal",
      status: "paid",
      issueDaysAgo: 30,
      dueDaysFromIssue: 14,
      paid: true,
      items: [
        { description: "Immigration document preparation", quantity: "1", unitPrice: "650.00" },
      ],
    },
    {
      clientName: "Carlos Mendoza",
      caseTitle: "Mobile notary for home closing",
      status: "unpaid",
      issueDaysAgo: 2,
      dueDaysFromIssue: 14,
      paid: false,
      items: [
        { description: "Mobile notary travel fee", quantity: "1", unitPrice: "25.00" },
        { description: "Notarization — closing documents", quantity: "1", unitPrice: "100.00" },
      ],
    },
    {
      clientName: "Kevin Torres",
      caseTitle: "University diploma apostille",
      status: "overdue",
      issueDaysAgo: 45,
      dueDaysFromIssue: 14,
      paid: false,
      items: [
        { description: "Apostille processing — diploma", quantity: "1", unitPrice: "95.00" },
      ],
    },
    {
      clientName: "Carmen Ruiz",
      caseTitle: "Business loan application",
      status: "paid",
      issueDaysAgo: 18,
      dueDaysFromIssue: 10,
      paid: true,
      items: [
        { description: "Business loan application assistance", quantity: "1", unitPrice: "500.00" },
      ],
    },
    {
      clientName: "Patricia Ortiz",
      caseTitle: "Affidavit notarization",
      status: "cancelled",
      issueDaysAgo: 5,
      dueDaysFromIssue: 14,
      paid: false,
      items: [
        { description: "Notarization — affidavit", quantity: "1", unitPrice: "35.00" },
      ],
    },
  ];

  for (const inv of invoiceSeed) {
    const client = byName(inv.clientName);
    const relatedCase = inv.caseTitle ? byTitle(inv.caseTitle) : undefined;
    const subtotal = inv.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const [invoiceRow] = await db
      .insert(invoices)
      .values({
        clientId: client.id,
        caseId: relatedCase?.id,
        status: inv.status,
        issueDate: dateOnly(daysFromNow(-inv.issueDaysAgo)),
        dueDate: dateOnly(daysFromNow(inv.dueDaysFromIssue - inv.issueDaysAgo)),
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        paymentMethod: inv.paid ? "Zelle" : null,
        paidAt: inv.paid ? daysFromNow(-inv.issueDaysAgo + 1) : null,
        notes: SEED_TAG,
      })
      .returning();

    await db.insert(invoiceLineItems).values(
      inv.items.map((item, index) => ({
        invoiceId: invoiceRow.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: (Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
        sortOrder: index,
      })),
    );
  }

  await db.insert(notaryLogEntries).values([
    {
      entryDate: dateOnly(daysFromNow(-10)),
      clientId: byName("Maria Gonzalez").id,
      caseId: byTitle("Power of attorney notarization").id,
      clientNameSnapshot: "Maria Gonzalez",
      documentType: "Power of Attorney",
      notarialActType: "acknowledgment",
      idVerificationMethod: "id_card",
      feeCharged: "45.00",
      notes: SEED_TAG,
    },
    {
      entryDate: dateOnly(daysFromNow(-1)),
      clientId: byName("Carlos Mendoza").id,
      caseId: byTitle("Mobile notary for home closing").id,
      clientNameSnapshot: "Carlos Mendoza",
      documentType: "Closing Disclosure",
      notarialActType: "jurat",
      idVerificationMethod: "id_card",
      feeCharged: "125.00",
      notes: SEED_TAG,
    },
    {
      entryDate: dateOnly(daysFromNow(-2)),
      clientId: byName("Jennifer Smith").id,
      caseId: byTitle("Remote online notarization — rental agreement").id,
      clientNameSnapshot: "Jennifer Smith",
      documentType: "Rental Agreement",
      notarialActType: "acknowledgment",
      idVerificationMethod: "personal_knowledge",
      feeCharged: "35.00",
      notes: SEED_TAG,
    },
  ]);

  await db.insert(apostilleDetails).values([
    {
      caseId: byTitle("Birth certificate apostille").id,
      destinationCountry: "Colombia",
      instrumentType: "Birth Certificate",
      submissionDate: dateOnly(daysFromNow(-3)),
      expectedReturnDate: dateOnly(daysFromNow(11)),
      notes: SEED_TAG,
    },
    {
      caseId: byTitle("University diploma apostille").id,
      destinationCountry: "Mexico",
      instrumentType: "University Diploma",
      submissionDate: dateOnly(daysFromNow(-40)),
      expectedReturnDate: dateOnly(daysFromNow(-25)),
      actualReturnDate: dateOnly(daysFromNow(-26)),
      notes: SEED_TAG,
    },
  ]);

  console.log(
    `Seeded ${clientRows.length} clients, ${caseRows.length} cases, ${invoiceSeed.length} invoices, plus appointments, notary log entries, and apostille details.`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
