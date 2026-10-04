export default function Pagination({
  page,
  count,
  onChange,
}: {
  page: number;
  count: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Results pages"
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        margin: "16px 0",
      }}
    >
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>Page {page} · up to 100 records · filters apply to this page</span>
      <button disabled={count < 100} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}
