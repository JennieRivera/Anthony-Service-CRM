import { z } from "zod";

export const paymentStatusValues = [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "refunded",
  "cancelled",
] as const;

export const refundStatusValues = ["none", "partial", "full"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const paymentFormSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  depositAmount: optionalString,
  amountPaid: z
    .string()
    .min(1, "Required")
    .refine((v) => Number(v) >= 0, "Must be 0 or more"),
  status: z.enum(paymentStatusValues),
  paymentDate: optionalString,
  paymentMethod: optionalString,
  transactionConfirmation: optionalString,
  receiptNumber: optionalString,
  refundStatus: z.enum(refundStatusValues),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
