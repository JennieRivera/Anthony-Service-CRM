import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { isUuid } from "@/lib/portal/queries";

// Staff view of a client's profile photo (added by the client in the
// portal). Private Blob, streamed through our server after auth().
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [client] = await getDb()
    .select({ photoBlobUrl: clients.photoBlobUrl })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  if (!client?.photoBlobUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await get(client.photoBlobUrl, { access: "private" }).catch(() => null);
  if (!result?.stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
