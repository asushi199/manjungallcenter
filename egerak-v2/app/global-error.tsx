"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ms">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#fff",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 18,
                fontWeight: 600,
                color: "#991b1b",
              }}
            >
              Halaman tidak dapat dimuatkan
            </h2>
            <p
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: 14,
                color: "#7f1d1d",
                lineHeight: 1.5,
              }}
            >
              Cuba muat semula sebentar lagi atau kembali ke{" "}
              <a
                href="/dashboard"
                style={{ color: "#b91c1c", textDecoration: "underline" }}
              >
                Utama
              </a>
              .
            </p>
            {error?.digest && (
              <p
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                Kod ralat: <code>{error.digest}</code>
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  background: "#0646a3",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cuba lagi
              </button>
              <a
                href="/dashboard"
                style={{
                  background: "#fff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Ke Utama
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
