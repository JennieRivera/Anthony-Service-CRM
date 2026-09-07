"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { serviceColorSettings } from "@/lib/db/schema";
import {
  serviceColorFormSchema,
  type ServiceColorFormValues,
} from "@/lib/validation/serviceColor";
import { logAuditEvent } from "@/lib/audit";

export async function updateServiceColorAction(
  key: string,
  rawValues: ServiceColorFormValues,
) {
  const values = serviceColorFormSchema.parse(rawValues);

  await getDb()
    .update(serviceColorSettings)
    .set({
      colorName: values.colorName,
      colorHex: values.colorHex,
      updatedAt: new Date(),
    })
    .where(eq(serviceColorSettings.key, key));

  await logAuditEvent({
    action: "service_color.updated",
    entityType: "service_color_settings",
    entityId: key,
    summary: `Updated color for "${key}" to ${values.colorName} (${values.colorHex})`,
  });

  revalidatePath("/settings/service-colors");
  revalidatePath("/appointments");
}
