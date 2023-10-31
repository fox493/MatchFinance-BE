export interface VerificationResult {
  valid: boolean;
  reason?: VerificationReason;
  token?: string;
}

export enum VerificationReason {
  SIGNATURE_VALID = 0,
  SIGNATURE_INVALID = 1,
  SIGNATURE_TIMEOUT = 2,
}
