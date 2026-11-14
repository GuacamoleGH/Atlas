import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPersonalizedGameRecommendations } from "@/lib/gameRecommendations/engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    const recommendations = await getPersonalizedGameRecommendations(session.user.id, {
      forceRefresh,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Error obteniendo recomendaciones de videojuegos:", error);
    return NextResponse.json(
      { error: "Error interno al generar recomendaciones" },
      { status: 500 }
    );
  }
}
