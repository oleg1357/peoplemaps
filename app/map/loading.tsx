export default function MapLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - var(--header-h))" }}>
      <p style={{ color: "var(--muted)", fontSize: "1.1em" }}>Loading map...</p>
    </div>
  );
}
