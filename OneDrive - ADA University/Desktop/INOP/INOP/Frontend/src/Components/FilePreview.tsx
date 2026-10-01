import { useEffect, useState } from "react";
export default function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    queueMicrotask(() => setUrl(u));
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return <img src={url || undefined} alt={file.name} />;
}
