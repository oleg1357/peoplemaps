import { Nav } from "./Nav";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root" style={{ height: "100%" }}>
      <Nav />
      {children}
    </div>
  );
}
