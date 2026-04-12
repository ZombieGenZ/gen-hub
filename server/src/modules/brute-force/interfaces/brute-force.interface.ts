/**
 * Brute Force Service interfaces
 */

/**
 * Interface cho unlock token data
 */
export interface IUnlockTokenData {
  code: string;
  ip: string;
  createdAt: number;
}

/**
 * Interface cho penalty rules
 */
export interface IPenaltyRules {
  [attempts: string]: number;
}
