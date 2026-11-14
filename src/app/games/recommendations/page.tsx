import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPersonalizedGameRecommendations } from "@/lib/gameRecommendations/engine";
import GameRecommendationsView from "@/components/games/recommendations/GameRecommendationsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Para ti · Gamer Hub | Atlas",
  description:
    "Recomendaciones personalizadas de videojuegos según tu historial, tus notas y tus plataformas en Atlas.",
};

export default async function GameRecommendationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/games/recommendations");
  }

  const recommendations = await getPersonalizedGameRecommendations(session.user.id);

  return <GameRecommendationsView initialData={recommendations} />;
}
