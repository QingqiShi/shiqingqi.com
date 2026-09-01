/**
 * Motion vectors for the pixel sprite, in *art-pixels* (the 42×42 species
 * sprite grid). The render boundary rounds to whole art-pixels and then
 * scales up to CSS pixels — that ordering keeps integer-pixel art aligned no
 * matter what `scale` factor the consumer picks.
 */

export interface Vec2 {
  dx: number;
  dy: number;
}

export interface EmotionMotion {
  body: Vec2;
}
