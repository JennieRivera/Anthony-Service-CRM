// MIADIAMANTE AI Foundation — Phase 1 interface, Phase 2B-3 FOUNDATION
// implementation (owner-approved: Vercel AI SDK + Vercel AI Gateway,
// model anthropic/claude-sonnet-5.5, AI Gateway system credentials, not
// BYOK). Master prompt section 17: "A future provider layer should make
// it possible to support an approved provider without rewriting AMS
// business authorization." Business capabilities (capabilities.ts) and
// RBAC enforcement (authorize.ts) depend on NOTHING in this file — this
// is the seam a future executor plugs into, not a dependency of the
// authorization layer. That remains true after this phase: nothing
// outside this file changed.
//
// STILL NOT LIVE (Phase 2B-3 foundation only, not activation):
// - No AI_GATEWAY_API_KEY has been added to any environment. Calling
//   getMiadiamanteModelProvider() still throws today — the exact same
//   observable behavior as Phase 1 ("No Fake Intelligence"), just with
//   an accurate reason now ("not configured" instead of "not
//   implemented").
// - AI_PROVIDER_CONNECTED (src/lib/ai/executionStatus.ts) is untouched
//   and remains false — this file does not and must not set it.
// - Nothing calls getMiadiamanteModelProvider() in production.
//   conversationController.ts has no knowledge of this file (confirmed
//   by its own existing "zero DB access" style regression test, which
//   also covers "does not import provider.ts" implicitly via its import
//   list check). Miadiamante.tsx's chat input remains disabled.
//
// PROVIDER-NEUTRAL BY DESIGN: MODEL_ID below is the one line that
// encodes a specific vendor/model. Changing providers later is a
// one-line change to this constant (plus, if truly switching SDKs
// entirely, a change to the generateText() call below) — nothing in
// conversationController.ts, capabilityRunner.ts, authorize.ts, or
// capabilities.ts needs to know or care which model answered.
//
// THE PROVIDER IS TRANSPORT/REASONING ONLY, NEVER AN AUTHORITY: this
// file has no knowledge of TOOL_RUNNERS, no import of capabilityRunner.ts
// or authorize.ts, and cannot execute anything — it only ever turns an
// already-authorized MiadiamanteModelRequest into text. A future caller
// (Phase 2B-4) is responsible for routing any resulting tool proposal
// back through the existing, unmodified conversationController.ts
// pipeline — this file does not and must not do that itself.

import { generateText } from "ai";
import type { MiadiamanteCapability } from "./capabilities";
import { assertNoSensitiveData } from "./sensitiveDataGuard";
import {
  MAX_OUTPUT_TOKENS,
  PROVIDER_TIMEOUT_MS,
  PROVIDER_MAX_RETRIES,
} from "./providerSafety";

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

// Owner-approved (Phase 2B-3): anthropic/claude-sonnet-5.5, verified
// directly against Vercel's official AI Gateway changelog — not
// guessed. This is the ONE place the specific model is named.
const MODEL_ID = "anthropic/claude-sonnet-5.5";

// Deliberately a function, not a module-level read, so a missing key is
// detected fresh on every call rather than cached from whenever this
// module first loaded (matches getCurrentRole()'s own "never cache a
// security-relevant check" convention used throughout this codebase).
function getGatewayApiKey(): string | null {
  return process.env.AI_GATEWAY_API_KEY || null;
}

// No provider is connected yet (no AI_GATEWAY_API_KEY in any
// environment — Phase 2B-3 foundation only). Calling this throws rather
// than silently returning a fake/mocked response — see master prompt
// section 19 ("No Fake Intelligence"). Once a key IS added (a future,
// separately-approved activation step), this same function starts
// returning a real, working adapter with zero other code change.
export function getMiadiamanteModelProvider(): MiadiamanteModelProvider {
  const apiKey = getGatewayApiKey();
  if (!apiKey) {
    throw new Error(
      "No MIADIAMANTE model provider is connected. AI_GATEWAY_API_KEY is not configured — this is expected; no AI Gateway key has been added yet (Phase 2B-3 foundation step, owner-approved activation pending).",
    );
  }

  return {
    async generate(request: MiadiamanteModelRequest): Promise<MiadiamanteModelResponse> {
      // Owner requirement (Phase 2B-3): SSN, ITIN, passwords, API keys,
      // and equivalent sensitive identifiers must never reach the
      // provider. Checked first, before any network call is even
      // constructed — not a redaction-and-continue, a hard block.
      //
      // Safety-review correction: authorizedData is typed `unknown` and
      // every real DTO in this codebase is an object (never a raw
      // string) — a `typeof === "string"` check alone would never fire
      // for any real capability result, leaving object/array/nested
      // DTO content completely unscanned. JSON.stringify() covers every
      // shape (string, object, array, nested, and null/undefined via
      // the `?? ""` fallback) with the exact same regex-based scanner,
      // no new scanning logic needed. This is defense-in-depth on top
      // of — never a replacement for — each capability's own DTO-layer
      // minimization (dto.ts), which remains the primary control.
      assertNoSensitiveData(request.userMessage);
      assertNoSensitiveData(JSON.stringify(request.authorizedData ?? ""));

      const result = await generateText({
        model: MODEL_ID,
        prompt: request.userMessage,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        timeout: PROVIDER_TIMEOUT_MS,
        maxRetries: PROVIDER_MAX_RETRIES,
        // Owner requirement (Phase 2B-3): BOTH required on every request.
        // AI Gateway system credentials only (never BYOK) — confirmed
        // against Vercel's own docs that neither filter is enforced on
        // BYOK requests, only on system-credential requests.
        providerOptions: {
          gateway: {
            zeroDataRetention: true,
            disallowPromptTraining: true,
          },
        },
      });

      return { text: result.text };
    },
  };
}
