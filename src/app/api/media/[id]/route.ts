import { currentUser } from "@/lib/auth";
import { loadImage } from "@/lib/media";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const img = Number.isInteger(id) && id > 0 ? await loadImage(id, await currentUser()) : null;
  if (!img) return new Response(img === false ? "Forbidden" : "Not found", { status: img === false ? 403 : 404, headers: { "Cache-Control": "no-store" } });
  return new Response(Buffer.from(img.data, "base64"), {
    headers: {
      "Content-Type": img.mime,
      // laundry photos are public; customers' item photos are only cached by the viewer's own browser
      "Cache-Control": img.private ? "private, max-age=86400" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
