import { useEffect, useState } from "react";
import api from "../api/axios";
function downloadBlob(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function PrivateFile({
  url,
  name,
  image = false,
}: {
  url: string;
  name: string;
  image?: boolean;
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const filename = url.split("/").pop() || "";
  useEffect(() => {
    if (!image) return;
    let active = true;
    let objectUrl = "";
    api
      .get(`/files/${encodeURIComponent(filename)}`, { responseType: "blob" })
      .then((r) => {
        objectUrl = URL.createObjectURL(r.data);
        if (active) setPreview(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => setError("Unable to load file"));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filename, image]);
  async function download() {
    try {
      const r = await api.get(`/files/${encodeURIComponent(filename)}`, {
        responseType: "blob",
      });
      downloadBlob(r.data, name);
    } catch {
      setError("Unable to download file");
    }
  }
  if (!url.startsWith("/uploads/"))
    return (
      <span>
        Legacy attachment unavailable — upload the original file again.
      </span>
    );
  return (
    <span>
      {image && preview && <img src={preview} alt={name} />}
      <button
        type="button"
        className="btn-secondary"
        onClick={() => void download()}
      >
        {name}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
