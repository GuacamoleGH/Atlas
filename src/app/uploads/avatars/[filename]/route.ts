import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } },
) {
  const rawFilename = params.filename;

  // Medida de seguridad: Validar que el nombre de archivo sea estrictamente su nombre base (sin traversal .. ni rutas relativas)
  if (
    !rawFilename ||
    path.basename(rawFilename) !== rawFilename ||
    rawFilename.includes("..")
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const uploadDir = path.resolve(process.cwd(), "public", "uploads", "avatars");
  const filePath = path.resolve(uploadDir, rawFilename);

  // Evitar cualquier intento de Path Traversal fuera del directorio de avatares
  if (!filePath.startsWith(uploadDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const ext = path.extname(rawFilename).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
