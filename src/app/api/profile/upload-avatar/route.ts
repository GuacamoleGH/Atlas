import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB máximo

function detectImageFormat(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  // WebP: RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // GIF: GIF87a or GIF89a
  const gifHeader = buffer.toString("ascii", 0, 6);
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return { ext: "gif", mime: "image/gif" };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = (formData.get("avatar") || formData.get("file")) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se ha proporcionado ninguna imagen" },
        { status: 400 },
      );
    }

    // 1. Verificación de tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "La imagen excede el límite máximo de 5 MB" },
        { status: 400 },
      );
    }

    if (file.size < 100) {
      return NextResponse.json(
        { error: "El archivo es demasiado pequeño o está corrupto" },
        { status: 400 },
      );
    }

    // 2. Verificación de tipo MIME reportado
    const clientType = (file.type || "").toLowerCase();
    const allowedClientMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedClientMimes.includes(clientType)) {
      return NextResponse.json(
        {
          error:
            "Formato de archivo no permitido. Solo se admiten imágenes JPG, PNG, WEBP o GIF.",
        },
        { status: 400 },
      );
    }

    // 3. Inspección profunda de Magic Bytes en el buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detectedFormat = detectImageFormat(buffer);

    if (!detectedFormat) {
      return NextResponse.json(
        {
          error:
            "Contenido de archivo no válido o sospechoso. Asegúrate de subir una imagen JPG, PNG, WEBP o GIF auténtica.",
        },
        { status: 400 },
      );
    }

    // 4. Nombre seguro y prevención de Path Traversal
    const safeUserId = session.user.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const filename = `avatar_${safeUserId}_${Date.now()}_${randomSuffix}.${detectedFormat.ext}`;

    const uploadDir = path.resolve(process.cwd(), "public", "uploads", "avatars");
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const targetPath = path.resolve(uploadDir, filename);
    if (!targetPath.startsWith(uploadDir)) {
      return NextResponse.json(
        { error: "Ruta de archivo no autorizada" },
        { status: 400 },
      );
    }

    // 5. Limpieza de avatares previos del mismo usuario para no llenar el disco
    try {
      const existingFiles = await fs.promises.readdir(uploadDir);
      const userPrefix = `avatar_${safeUserId}_`;
      for (const item of existingFiles) {
        if (item.startsWith(userPrefix)) {
          await fs.promises.unlink(path.join(uploadDir, item)).catch(() => {});
        }
      }
    } catch (cleanupErr) {
      console.warn("Advertencia en limpieza de avatares previos:", cleanupErr);
    }

    // 6. Guardar archivo en disco
    await fs.promises.writeFile(targetPath, buffer);

    // 7. Actualizar avatar en base de datos
    const publicUrl = `/uploads/avatars/${filename}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: publicUrl },
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: "Foto de perfil actualizada correctamente",
    });
  } catch (error: any) {
    console.error("Error en POST /api/profile/upload-avatar:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la subida del avatar" },
      { status: 500 },
    );
  }
}
