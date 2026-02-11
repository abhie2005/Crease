/**
 * Username validation and normalization for profile and signup.
 * Used by profile setup and username availability checks.
 */

import type { UsernameValidationResult } from '@/types/username';

export type { UsernameValidationResult };

/**
 * Validates username format.
 * Rules:
 * - 3-20 characters
 * - Alphanumeric, underscore, and hyphen only
 * - No spaces
 * @param username - Raw username input
 * @returns Validation result with optional error message
 */
export const validateUsernameFormat = (
  username: string
): UsernameValidationResult => {
  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Username is required' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be at most 20 characters' };
  }

  // Only alphanumeric, underscore, and hyphen allowed
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    };
  }

  return { valid: true };
};

/**
 * Normalizes username for storage and comparison (lowercase, trim).
 * @param username - Raw username input
 * @returns Normalized username
 */
export const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase();
};
