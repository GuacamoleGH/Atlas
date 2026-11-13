import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión para ver tus recomendaciones." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const recommendations = await getRecommendations(session.user.id, {
      forceRefresh,
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Error en GET /api/recommendations:", error);
    return NextResponse.json(
      { error: "Error al generar recomendaciones personalizadas." },
      { status: 500 }
    );
  }
}
