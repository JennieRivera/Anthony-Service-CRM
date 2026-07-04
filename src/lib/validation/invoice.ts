import { z } from "zod";

export const invoiceStatusValues = [
  "unpaid",
  "paid",
  "overdue",
  "cancelled",
] as const;

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) > 0, "Must be greater than 0"),
  unitPrice: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 0, "Must be 0 or more"),
});

export const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  caseId: z.string().optional().or(z.literal("")),
  status: z.enum(invoiceStatusValues),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  items: z.array(invoiceLineItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const markPaidSchema = z.object({
  paymentMethod: z.string().trim().min(1, "Payment method is required"),
});
