import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommendations";
import RecommendationsView from "@/components/recommendations/RecommendationsView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Para ti · Recomendaciones Personalizadas | Atlas",
  description:
    "Descubre películas y series recomendadas a tu medida según tus gustos, tus obras vistas y tu watchlist en Atlas.",
};

export default async function RecommendationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/recommendations");
  }

  const recommendations = await getRecommendations(session.user.id);

  return <RecommendationsView initialData={recommendations} />;
}
