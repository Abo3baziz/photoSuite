import { z } from 'zod';

/**
 * Result envelope for every cross-context request/response exchange.
 * Handlers throw {@link DomainError}; the router converts them into `ok:false`.
 */

export type RpcError = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
};

export type RpcResponse<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: RpcError };

export function rpcOk<T>(data: T): RpcResponse<T> {
  return { ok: true, data };
}

export function rpcError(code: string, message: string, details?: unknown): { readonly ok: false; readonly error: RpcError } {
  return { ok: false, error: details === undefined ? { code, message } : { code, message, details } };
}

/** Thrown by handlers; routers catch it and serialize it. */
export class DomainError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

/** Wire shape of a response envelope, validated before trusting its `data`. */
export const RpcEnvelopeSchema: z.ZodType<RpcResponse<unknown>> = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
]) as z.ZodType<RpcResponse<unknown>>;

export function parseRpcEnvelope(raw: unknown): RpcResponse<unknown> {
  return RpcEnvelopeSchema.parse(raw);
}
