// Stop sheet formula injection: text that would start a formula is stored with a leading apostrophe.
function sanitizeCell(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

// Inverse of sanitizeCell, applied on read.
function unsanitizeCell(v) {
  return typeof v === 'string' && /^'[=+\-@]/.test(v) ? v.slice(1) : v;
}
