export function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Consume the explicit download before releasing its URL, even on failure.
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }
}
