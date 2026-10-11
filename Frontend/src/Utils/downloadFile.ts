export function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Let the browser consume the explicit download before releasing its own URL.
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
}
