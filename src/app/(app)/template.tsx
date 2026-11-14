/** Re-mounted on every navigation: a short fade between pages. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
