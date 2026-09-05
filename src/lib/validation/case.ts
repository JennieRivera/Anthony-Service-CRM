import { z } from "zod";
import { serviceTypeValues } from "./client";
import { paymentStatusValues } from "./payment";

export const caseStatusValues = [
  "new",
  "in_progress",
  "waiting_on_client",
  "completed",
  "cancelled",
] as const;

export const notarialActTypeValues = [
  "jurat",
  "acknowledgment",
  "oath_affirmation",
  "signature_witnessing",
  "copy_certification",
  "other",
] as const;

export const idVerificationMethodValues = [
  "personal_knowledge",
  "id_card",
  "credible_witness",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const caseFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  serviceType: z.enum(serviceTypeValues),
  status: z.enum(caseStatusValues),
  title: z.string().trim().min(1, "Title is required"),
  dueDate: optionalString,
  fee: optionalString,
  notes: optionalString,
  // Phase 2 foundation fields (Session 0)
  startDate: z.string().min(1, "Start date is required"),
  nextFollowUpDate: optionalString,
  documentsRequested: optionalString,
  documentsReceived: optionalString,
  paymentStatus: z.enum(paymentStatusValues).optional().or(z.literal("")),
  referralSource: optionalString,
  nextAction: optionalString,
  // Notary journal (only relevant when serviceType is Online Notary)
  notaryDocumentType: optionalString,
  notarialActType: z.enum(notarialActTypeValues).optional(),
  idVerificationMethod: z.enum(idVerificationMethodValues).optional(),
  notaryFeeCharged: optionalString,
  // Apostille / authentication details (optional add-on for Document Prep cases)
  destinationCountry: optionalString,
  instrumentType: optionalString,
  submissionDate: optionalString,
  expectedReturnDate: optionalString,
  actualReturnDate: optionalString,
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const notaryServiceTypes = ["online_notary"];
