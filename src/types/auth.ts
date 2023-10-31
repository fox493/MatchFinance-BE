export interface UserPayload {
  id: string;
  email: string;
  player_id: string;
  login_method: 'account' | 'wallet';
  public_address: string;
}

export interface AuthorziedRequest extends Request {
  user?: UserPayload;
}

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
