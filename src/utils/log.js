/**
 * Structured logging for storage/async operations.
 * Logs operation name and error only (no PII per hce/no-pii-in-logs).
 */
export function logStorageError(operation, error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${operation}]`, message)
}
