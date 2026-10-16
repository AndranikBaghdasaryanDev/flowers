"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf8f4", color: "#2b1e23", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.3em", color: "#781241", fontSize: 22 }}>FLORIANI</p>
          <h1 style={{ fontWeight: 400 }}>Something went wrong</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: "#781241", color: "#fff", border: 0, borderRadius: 999, padding: "12px 22px", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
