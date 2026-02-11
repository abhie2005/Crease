/**
 * Shared type primitives used across the app.
 */

/** Firebase user/document ID. */
export type Uid = string;

/** Optional string (form input, search query). */
export type OptionalString = string | undefined;

/** Async result that may be absent. */
export type Maybe<T> = T | null;
