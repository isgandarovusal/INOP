type Props = { url: string; type?: string; name: string; onClose: () => void };
export default function PrivateFilePreview({ url, type, name, onClose }: Props) {
  return <div role="dialog" aria-label={name} className="audit-card">
    <button type="button" onClick={onClose}>Bağla</button>
    {type === "application/pdf" && <iframe referrerPolicy="no-referrer" src={url} title={name} style={{ width: "100%", height: "65vh" }} />}
    <a href={url} download={name}>Endir: {name}</a>
  </div>;
}
