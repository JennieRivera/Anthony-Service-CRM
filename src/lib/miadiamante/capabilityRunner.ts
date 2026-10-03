// MIADIAMANTE AI Foundation — Phase 1. The request lifecycle from master
// prompt section 15, implemented end to end for the two read-only
// capabilities this phase ships:
//
//   caller -> authenticate (getCurrentRole, inside authorizeMiadiamanteRead)
//          -> capability lookup (authorize.ts)
//          -> RBAC check (authorize.ts, layer 1)
//          -> AI permission check (authorize.ts, layer 2)
//          -> controlled data retrieval (dto.ts — explicit field lists only)
//          -> (masking: not applicable to these two capabilities — see
//             capabilities.ts maskingPolicy: "none")
//          -> audit entry shaped (audit.ts — not yet persisted, see its header)
//          -> response
//
// This is a server-only module ("use server" via its callers) — nothing
// here is reachable from client code, and no step is skippable by a
// caller: runCapability() is the only export, and it always runs
// authorization first regardless of which capability is requested.
//
// No natural-language handling exists here at all (no intent
// classification, no provider call) — see provider.ts and the Phase 1
// report item AE: the deployed MIADIAMANTE UI's chat input remains
// disabled this phase. This runner exists so the pipeline is real and
// testable before any UI wiring is proposed.
//
// SECURITY (Phase 1B, master prompt section 11): the human-actor identity
// written into the audit entry below comes ONLY from `auth()` — the
// server-resolved session — never from a function parameter, request
// body, header, or any other caller-supplied input. Neither exported
// function below (`runCurrentUserContext`, `runAuthorizedNavigation`)
// even accepts an argument, so there is structurally no parameter a
// caller could use to spoof a different identity; this isn't just "a
// spoofed value is ignored," there is no input path for one to exist in
// the first place. Any future capability added here must keep this
// shape — never add a `requestedByEmail`-style parameter to a capability
// function signature.

import { auth } from "@/auth";
import { authorizeMiadiamanteRead, type MiadiamanteAuthorizationResult } from "./authorize";
import { buildMiadiamanteAuditEntry, type MiadiamanteAuditEntry } from "./audit";
import { getCurrentUserContext, getAuthorizedNavigation, type CurrentUserContextDto, type AuthorizedNavigationDto } from "./dto";
import type { ImplementedCapabilityName } from "./capabilities";

export type MiadiamanteCapabilityResult<TData> =
  | { allowed: true; data: TData; audit: MiadiamanteAuditEntry }
  | { allowed: false; message: string; audit: MiadiamanteAuditEntry };

async function run<TData>(
  capabilityName: ImplementedCapabilityName,
  fetchData: () => Promise<TData | null>,
): Promise<MiadiamanteCapabilityResult<TData>> {
  const result: MiadiamanteAuthorizationResult = await authorizeMiadiamanteRead(capabilityName);
  const session = await auth();

  const audit = buildMiadiamanteAuditEntry({
    capabilityName,
    requestedByEmail: session?.user?.email ?? null,
    result,
  });

  if (!result.allowed) {
    return { allowed: false, message: result.message, audit };
  }

  const data = await fetchData();
  if (data === null) {
    // Authorization passed but the underlying session resolved to
    // nothing (should not happen given authorizeMiadiamanteRead already
    // required a role) — fail safe rather than return a partial shape.
    return {
      allowed: false,
      message: "MIADIAMANTE can't help with that yet.",
      audit: { ...audit, outcome: "denied", errorMessage: "fetchData returned null after authorization passed" },
    };
  }

  return { allowed: true, data, audit };
}

export async function runCurrentUserContext(): Promise<
  MiadiamanteCapabilityResult<CurrentUserContextDto>
> {
  return run("current_user_context.read", getCurrentUserContext);
}

export async function runAuthorizedNavigation(): Promise<
  MiadiamanteCapabilityResult<AuthorizedNavigationDto>
> {
  return run("authorized_navigation.read", getAuthorizedNavigation);
}
