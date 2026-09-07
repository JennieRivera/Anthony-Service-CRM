import { z } from "zod";

export const serviceColorFormSchema = z.object({
  colorName: z.string().trim().min(1, "Color name is required"),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Enter a valid hex color (e.g. #2E7D32)"),
});

export type ServiceColorFormValues = z.infer<typeof serviceColorFormSchema>;
