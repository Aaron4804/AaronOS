import { ImageResponse } from "next/og";

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  if (!["180", "192", "512"].includes(size)) return new Response(null, { status: 404 });
  const pixels = Number(size);
  return new ImageResponse(<div style={{
    display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%",
    background: "#101d17", color: "#92efc4", fontSize: pixels * .48, fontWeight: 800,
  }}>A</div>, { width: pixels, height: pixels, headers: { "Cache-Control": "public, max-age=86400" } });
}
