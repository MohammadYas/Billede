/** Pipeline error with a code the UI maps to copy (timeout/provider → retry; the rest → manual review). No heavy imports here. */
export class RestoreError extends Error {
  constructor(public code: 'timeout' | 'unsupported_image' | 'too_small' | 'provider_error' | 'unknown', message: string) {
    super(message);
  }
}
