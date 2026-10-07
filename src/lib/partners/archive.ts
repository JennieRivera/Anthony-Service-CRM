import { and, desc, eq, inArray, or } from "drizzle-orm";
import { allianceDocuments, partnerPhotos, partnerProfiles } from "@/lib/db/schema";
import type { PortalDb } from "@/lib/portal/db";
import { isUuid, listPartnerMarketing } from "./queries";

// "My files" (Diamante Conecta 360): one archive per alliance with three
// folders — Documents, Photos & images, Marketing. The ally sees its own
// files and what AMS marked visible; staff sees everything, with the same
// folders, on the alliance record and in Documents → Alliances.
//   • Documents / Photos: alliance_documents (folder column). The ally can
//     move ITS OWN uploads between them; staff can move any. Only web
//     images (JPG, PNG, WEBP) go in Photos.
//   • Photos also shows the profile gallery and the logo (managed in "My
//     profile", not movable).
//   • Marketing: what AMS shares with the ally (read-only).

export type ArchiveFolder = "documents" | "photos" | "marketing";
export const MOVABLE_FOLDERS = ["documents", "photos"] as const;
export type MovableFolder = (typeof MOVABLE_FOLDERS)[number];

export type ArchiveItem = {
  key: string;
  id: string;
  source: "document" | "gallery" | "logo" | "marketing";
  folder: ArchiveFolder;
  fileName: string;
  createdAt: string | null;
  documentType: string | null;
  fromPartner: boolean;
  visibleToPartner: boolean;
  sensitive: boolean;
  isImage: boolean;
  viewUrl: string;
  downloadUrl: string;
  movable: boolean;
};

export const isWebImageName = (name: string) => /\.(jpe?g|png|webp)$/i.test(name);

type RawDoc = {
  id: string;
  createdAt: Date;
  fileName: string;
  documentType: string | null;
  uploadedByPartner: boolean;
  visibleToPartner: boolean;
  sensitiveDataReason: string | null;
  folder: MovableFolder;
};
type RawArchive = {
  docs: RawDoc[];
  photos: { id: string; fileName: string }[];
  logo: boolean;
  marketing: { id: string; createdAt: Date; fileName: string }[];
};

type Viewer = { kind: "partner" } | { kind: "staff"; allianceId: string };

function urls(viewer: Viewer) {
  const p = viewer.kind === "partner";
  const a = viewer.kind === "staff" ? viewer.allianceId : "";
  return {
    doc: (id: string) => (p ? `/api/partners/documents/${id}/file` : `/api/alliance-documents/${id}/file`),
    gallery: (id: string) => (p ? `/api/partners/photos/${id}` : `/api/alliances/${a}/partner-file?photo=${id}`),
    logo: () => (p ? "/api/partners/logo" : `/api/alliances/${a}/partner-file`),
    marketing: (id: string) => (p ? `/api/partners/marketing/${id}/file` : `/api/marketing-content/${id}/file`),
  };
}
const dl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}download=1`;

export function buildArchiveItems(raw: RawArchive, viewer: Viewer): ArchiveItem[] {
  const u = urls(viewer);
  const staff = viewer.kind === "staff";
  const items: ArchiveItem[] = raw.docs.map((d) => ({
    key: `doc-${d.id}`,
    id: d.id,
    source: "document",
    folder: d.folder,
    fileName: d.fileName,
    createdAt: d.createdAt.toISOString(),
    documentType: d.documentType,
    fromPartner: d.uploadedByPartner,
    visibleToPartner: d.visibleToPartner || d.uploadedByPartner,
    sensitive: Boolean(d.sensitiveDataReason),
    isImage: isWebImageName(d.fileName),
    viewUrl: u.doc(d.id),
    downloadUrl: dl(u.doc(d.id)),
    movable: staff || d.uploadedByPartner,
  }));
  if (raw.logo) {
    items.push({
      key: "logo",
      id: "logo",
      source: "logo",
      folder: "photos",
      fileName: "Logo",
      createdAt: null,
      documentType: null,
      fromPartner: true,
      visibleToPartner: true,
      sensitive: false,
      isImage: true,
      viewUrl: u.logo(),
      downloadUrl: dl(u.logo()),
      movable: false,
    });
  }
  for (const p of raw.photos) {
    items.push({
      key: `gallery-${p.id}`,
      id: p.id,
      source: "gallery",
      folder: "photos",
      fileName: p.fileName,
      createdAt: null,
      documentType: null,
      fromPartner: true,
      visibleToPartner: true,
      sensitive: false,
      isImage: true,
      viewUrl: u.gallery(p.id),
      downloadUrl: dl(u.gallery(p.id)),
      movable: false,
    });
  }
  for (const m of raw.marketing) {
    items.push({
      key: `marketing-${m.id}`,
      id: m.id,
      source: "marketing",
      folder: "marketing",
      fileName: m.fileName,
      createdAt: m.createdAt.toISOString(),
      documentType: null,
      fromPartner: false,
      visibleToPartner: true,
      sensitive: false,
      isImage: isWebImageName(m.fileName),
      viewUrl: u.marketing(m.id),
      downloadUrl: dl(u.marketing(m.id)),
      movable: false,
    });
  }
  return items;
}

const docColumns = {
  id: allianceDocuments.id,
  allianceId: allianceDocuments.allianceId,
  createdAt: allianceDocuments.createdAt,
  fileName: allianceDocuments.fileName,
  documentType: allianceDocuments.documentType,
  uploadedByPartner: allianceDocuments.uploadedByPartner,
  visibleToPartner: allianceDocuments.visibleToPartner,
  sensitiveDataReason: allianceDocuments.sensitiveDataReason,
  folder: allianceDocuments.folder,
};

// The archive of ONE alliance. For the ally (viewer partner): only its own
// uploads and what staff marked visible. allianceId always comes from the
// session (partner) or the page (staff).
export async function getAllianceArchive(db: PortalDb, allianceId: string, viewer: "partner" | "staff"): Promise<ArchiveItem[]> {
  const docWhere =
    viewer === "partner"
      ? and(
          eq(allianceDocuments.allianceId, allianceId),
          or(eq(allianceDocuments.visibleToPartner, true), eq(allianceDocuments.uploadedByPartner, true)),
        )
      : eq(allianceDocuments.allianceId, allianceId);
  const [docs, photos, [profile], marketing] = await Promise.all([
    db.select(docColumns).from(allianceDocuments).where(docWhere).orderBy(desc(allianceDocuments.createdAt)),
    db
      .select({ id: partnerPhotos.id, fileName: partnerPhotos.fileName })
      .from(partnerPhotos)
      .where(eq(partnerPhotos.allianceId, allianceId))
      .orderBy(partnerPhotos.createdAt),
    db.select({ logo: partnerProfiles.logoBlobUrl }).from(partnerProfiles).where(eq(partnerProfiles.allianceId, allianceId)).limit(1),
    listPartnerMarketing(db, allianceId).then((m) => m.shared),
  ]);
  return buildArchiveItems(
    { docs, photos, logo: Boolean(profile?.logo), marketing },
    viewer === "partner" ? { kind: "partner" } : { kind: "staff", allianceId },
  );
}

// Staff archives for several alliances at once (Documents → Alliances).
export async function getAllianceArchives(db: PortalDb, allianceIds: string[]): Promise<Record<string, ArchiveItem[]>> {
  if (allianceIds.length === 0) return {};
  const [docs, photos, profiles] = await Promise.all([
    db.select(docColumns).from(allianceDocuments).where(inArray(allianceDocuments.allianceId, allianceIds)).orderBy(desc(allianceDocuments.createdAt)),
    db
      .select({ id: partnerPhotos.id, fileName: partnerPhotos.fileName, allianceId: partnerPhotos.allianceId })
      .from(partnerPhotos)
      .where(inArray(partnerPhotos.allianceId, allianceIds))
      .orderBy(partnerPhotos.createdAt),
    db
      .select({ allianceId: partnerProfiles.allianceId, logo: partnerProfiles.logoBlobUrl })
      .from(partnerProfiles)
      .where(inArray(partnerProfiles.allianceId, allianceIds)),
  ]);
  const out: Record<string, ArchiveItem[]> = {};
  for (const id of allianceIds) {
    const marketing = (await listPartnerMarketing(db, id)).shared;
    out[id] = buildArchiveItems(
      {
        docs: docs.filter((d) => d.allianceId === id),
        photos: photos.filter((p) => p.allianceId === id),
        logo: Boolean(profiles.find((p) => p.allianceId === id)?.logo),
        marketing,
      },
      { kind: "staff", allianceId: id },
    );
  }
  return out;
}

export class ArchiveMoveError extends Error {}

// "Move to…": Documents ↔ Photos & images. The ally only moves its own
// uploads; only web images can go to Photos.
export async function moveAllianceDocument(
  db: PortalDb,
  params: { allianceId: string; documentId: unknown; folder: unknown; by: "partner" | "staff" },
) {
  if (!isUuid(params.documentId) || !(MOVABLE_FOLDERS as readonly unknown[]).includes(params.folder)) throw new ArchiveMoveError("invalid");
  const folder = params.folder as MovableFolder;
  const own = and(
    eq(allianceDocuments.id, params.documentId),
    eq(allianceDocuments.allianceId, params.allianceId),
    ...(params.by === "partner" ? [eq(allianceDocuments.uploadedByPartner, true)] : []),
  );
  const [doc] = await db.select({ fileName: allianceDocuments.fileName, folder: allianceDocuments.folder }).from(allianceDocuments).where(own).limit(1);
  if (!doc) throw new ArchiveMoveError("not_found");
  if (folder === "photos" && !isWebImageName(doc.fileName)) throw new ArchiveMoveError("not_image");
  if (doc.folder === folder) return doc;
  await db.update(allianceDocuments).set({ folder }).where(own);
  return { ...doc, from: doc.folder, folder };
}

