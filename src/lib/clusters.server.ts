// Fonte única para persistência de clusters de conteúdo (CRUD).
// A geração via IA permanece em clusters.functions.ts nesta fase.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface ClusterPillar {
  title: string;
  description: string;
  keywords: string[];
}
export interface ClusterSatellite {
  title: string;
  keyword: string;
  intent: string;
}
export interface ClusterInternalLink {
  from: string;
  to: string;
  anchor: string;
}
export interface StoredCluster {
  id: string;
  created_at: string;
  topic: string;
  language: string;
  pillar: ClusterPillar;
  satellites: ClusterSatellite[];
  primaryKeywords: string[];
  secondaryKeywords: string[];
  internalLinks: ClusterInternalLink[];
}

export interface SaveClusterInput {
  topic: string;
  language: string;
  pillar: ClusterPillar;
  satellites: ClusterSatellite[];
  primaryKeywords: string[];
  secondaryKeywords: string[];
  internalLinks: ClusterInternalLink[];
}

export async function saveClusterFor(
  supabase: SB,
  userId: string,
  input: SaveClusterInput,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("content_clusters")
    .insert({
      user_id: userId,
      topic: input.topic,
      language: input.language,
      pillar: input.pillar as unknown as Database["public"]["Tables"]["content_clusters"]["Insert"]["pillar"],
      satellites: input.satellites as unknown as Database["public"]["Tables"]["content_clusters"]["Insert"]["satellites"],
      primary_keywords: input.primaryKeywords,
      secondary_keywords: input.secondaryKeywords,
      internal_links: input.internalLinks as unknown as Database["public"]["Tables"]["content_clusters"]["Insert"]["internal_links"],
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível salvar o cluster.");
  return { id: data.id };
}

export async function listClustersFor(supabase: SB): Promise<StoredCluster[]> {
  const { data, error } = await supabase
    .from("content_clusters")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os clusters.");
  return (data ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    topic: r.topic,
    language: r.language,
    pillar: r.pillar as unknown as ClusterPillar,
    satellites: (r.satellites as unknown as ClusterSatellite[]) ?? [],
    primaryKeywords: r.primary_keywords ?? [],
    secondaryKeywords: r.secondary_keywords ?? [],
    internalLinks: (r.internal_links as unknown as ClusterInternalLink[]) ?? [],
  }));
}

export async function deleteClusterFor(supabase: SB, id: string): Promise<void> {
  const { error } = await supabase.from("content_clusters").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o cluster.");
}
