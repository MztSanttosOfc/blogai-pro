// BlogAI Pro — v1.1 Onda 2
// Estilos de imagem oficiais. Client-safe: usado pela UI e pelo servidor.
// Fonte única — Perfil Inteligente (ai_prefs.preferred_image_style) referencia
// diretamente uma destas chaves.

export type ImageStyleKey =
  | "normal"
  | "ultra_realista"
  | "fotografia"
  | "ilustracao"
  | "arte_digital"
  | "minimalista"
  | "cartoon"
  | "anime"
  | "3d";

export interface ImageStyle {
  key: ImageStyleKey;
  label: string;
  description: string;
  /** Fragmento em inglês injetado no prompt de geração de imagem. */
  prompt: string;
}

/** Estilo padrão quando o usuário não escolheu nenhum. */
export const DEFAULT_IMAGE_STYLE: ImageStyleKey = "normal";

export const IMAGE_STYLES: ImageStyle[] = [
  {
    key: "normal",
    label: "Normal (editorial)",
    description: "Ilustração editorial equilibrada, ideal para qualquer nicho.",
    prompt:
      "Professional editorial blog illustration, clean modern and futuristic flat design, tech-forward aesthetic, soft cinematic lighting, vibrant but tasteful colors, high quality, sharp focus.",
  },
  {
    key: "ultra_realista",
    label: "Ultra Realista",
    description: "Imagens hiper-realistas com detalhes fotográficos precisos.",
    prompt:
      "Ultra realistic hyper-detailed image, photorealistic textures, natural lighting, DSLR photography quality, 8K, sharp focus, lifelike skin and materials, accurate reflections and shadows.",
  },
  {
    key: "fotografia",
    label: "Fotografia",
    description: "Estética de fotografia profissional (câmera DSLR).",
    prompt:
      "Professional DSLR photography, 50mm lens look, natural depth of field, cinematic composition, editorial magazine style, balanced exposure, true-to-life colors.",
  },
  {
    key: "ilustracao",
    label: "Ilustração",
    description: "Ilustração artística com traços marcantes e cores vivas.",
    prompt:
      "Modern hand-drawn illustration, expressive line art, vibrant color palette, editorial illustration style, subtle textures, poster-quality composition.",
  },
  {
    key: "arte_digital",
    label: "Arte Digital",
    description: "Arte digital moderna com cores saturadas e composição dinâmica.",
    prompt:
      "Contemporary digital art, dynamic composition, rich saturated colors, painterly brush work, concept-art style, dramatic lighting, ArtStation trending quality.",
  },
  {
    key: "minimalista",
    label: "Minimalista",
    description: "Composição limpa, muito espaço em branco e paleta reduzida.",
    prompt:
      "Minimalist design, generous negative space, limited pastel or monochrome palette, geometric shapes, clean flat vectors, elegant restraint, editorial magazine minimalism.",
  },
  {
    key: "cartoon",
    label: "Cartoon",
    description: "Estética de desenho animado, personagens amigáveis e cores alegres.",
    prompt:
      "Friendly cartoon style, bold outlines, cheerful bright colors, rounded shapes, playful characters, western animation look, fun and welcoming mood.",
  },
  {
    key: "anime",
    label: "Anime",
    description: "Estilo anime/mangá japonês com traço característico.",
    prompt:
      "Japanese anime and manga style, expressive characters, cel-shaded coloring, dynamic angles, clean line art, vibrant sky palette, studio-quality key art.",
  },
  {
    key: "3d",
    label: "3D",
    description: "Renderização 3D moderna com iluminação suave e materiais realistas.",
    prompt:
      "Modern 3D render, soft global illumination, subsurface scattering, realistic PBR materials, cinema-quality shading, octane render feel, tasteful color grading.",
  },
];

const STYLE_MAP: Record<ImageStyleKey, ImageStyle> = IMAGE_STYLES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<ImageStyleKey, ImageStyle>,
);

export function resolveImageStyle(
  key: string | null | undefined,
): ImageStyle {
  if (key && key in STYLE_MAP) return STYLE_MAP[key as ImageStyleKey];
  return STYLE_MAP[DEFAULT_IMAGE_STYLE];
}

/** Sufixo universal aplicado a TODO estilo — mantém consistência editorial. */
export const UNIVERSAL_IMAGE_SUFFIX =
  "No text, no watermark, no logos, no letters, no captions.";
