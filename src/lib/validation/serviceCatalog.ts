import { z } from "zod";
import { serviceTypeValues } from "@/lib/validation/client";

export const serviceCatalogItemFormSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
  serviceType: z.enum(serviceTypeValues),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Enter a valid price"),
  active: z.boolean(),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ServiceCatalogItemFormValues = z.infer<
  typeof serviceCatalogItemFormSchema
>;
