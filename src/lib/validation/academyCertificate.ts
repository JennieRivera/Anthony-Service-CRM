import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

// Override reason is required only when overrideUsed is true — enforced
// with a refine rather than a plain .min(1) on an always-required field,
// since the override itself is optional and most issuances never use it.
export const issueCertificateFormSchema = z
  .object({
    issuedBy: z.string().trim().min(1, "Issued By is required"),
    completionDate: optionalString,
    notes: optionalString,
    overrideUsed: z.boolean(),
    overrideReason: optionalString,
  })
  .refine(
    (values) => !values.overrideUsed || Boolean(values.overrideReason?.trim()),
    {
      message: "A reason is required to issue a certificate that does not meet requirements",
      path: ["overrideReason"],
    },
  );

export type IssueCertificateFormValues = z.input<typeof issueCertificateFormSchema>;

export const revokeCertificateFormSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to revoke a certificate"),
});

export type RevokeCertificateFormValues = z.input<typeof revokeCertificateFormSchema>;
