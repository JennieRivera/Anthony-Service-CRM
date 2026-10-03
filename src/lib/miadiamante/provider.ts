// MIADIAMANTE AI Foundation — Phase 1. Provider-neutral interface ONLY.
// No implementation, no SDK import, no network call, no vendor name
// anywhere in this file. Master prompt section 17: "A future provider
// layer should make it possible to support an approved provider without
// rewriting AMS business authorization." Business capabilities
// (capabilities.ts) and RBAC enforcement (authorize.ts) depend on
// NOTHING in this file — this is the seam a future executor plugs into,
// not a dependency of the authorization layer.
//
// Confirmed by this phase's audit (report item L): no AI provider SDK is
// installed in package.json, and no AI-provider environment variable
// name exists anywhere in this repository today. This file does not
// change that — it defines a shape, nothing more.

import type { MiadiamanteCapability } from "./capabilities";

// What a future executor would hand the provider: the already-authorized
// capability (never a raw user message routed straight to a model with
// no server-side gate — see master prompt section 15), plus whatever
// minimum-necessary, already-masked data that capability's DTO produced.
export interface MiadiamanteModelRequest {
  capability: MiadiamanteCapability;
  /** Already-masked, already-minimum-necessary data — never a raw DB row. */
  authorizedData: unknown;
  /** The end user's natural-language question, for the provider to phrase a response around — never used to decide authorization, which has already happened by this point. */
  userMessage: string;
}

export interface MiadiamanteModelResponse {
  text: string;
}

// A future provider adapter implements this. Intentionally the entire
// contract — no streaming, no tool-calling, no conversation-history
// parameter, since none of those are approved for this phase (master
// prompt sections 16, 19, 38). Expanding this interface is a later
// phase's decision, not an assumption baked in now.
export interface MiadiamanteModelProvider {
  generate(request: MiadiamanteModelRequest): Promise<MiadiamanteModelResponse>;
}

// No provider is registered. Calling this throws rather than silently
// returning a fake/mocked response — see master prompt section 19 ("No
// Fake Intelligence"). This is the one function a future "connect a
// provider" phase would change, and the only place a vendor SDK would
// ever be imported.
export function getMiadiamanteModelProvider(): MiadiamanteModelProvider {
  throw new Error(
    "No MIADIAMANTE model provider is connected. This is expected — see AI Foundation Phase 1 report, item AG.",
  );
}
