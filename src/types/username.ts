/**
 * Username validation types.
 */

/** Result of username validation (valid flag and optional error message). */
export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
}
