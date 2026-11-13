import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addRecommendationExclusion } from "@/lib/recommendations";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mediaType, tmdbId, title } = body;

    if (!mediaType || !tmdbId || (mediaType !== "movie" && mediaType !== "tv")) {
      return NextResponse.json(
        { error: "Parámetros inválidos. Se requiere mediaType ('movie' | 'tv') y tmdbId." },
        { status: 400 }
      );
    }

    await addRecommendationExclusion(
      session.user.id,
      mediaType,
      Number(tmdbId),
      title
    );

    return NextResponse.json({
      success: true,
      message: `Título excluido de futuras recomendaciones.`,
    });
  } catch (error) {
    console.error("Error en POST /api/recommendations/exclude:", error);
    return NextResponse.json(
      { error: "Error al excluir recomendación." },
      { status: 500 }
    );
  }
}
