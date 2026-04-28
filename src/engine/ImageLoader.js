/**
 * ImageLoader — Preloads scene background images.
 */

const cache = {};

export function loadImage(src) {
  if (cache[src]) return Promise.resolve(cache[src]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { cache[src] = img; resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export function getImage(src) {
  return cache[src] || null;
}

/** Preload all scene backgrounds */
export async function preloadAll() {
  const paths = [
    '/assets/scene_splash.png',
    '/assets/scene_doors.png',
    '/assets/scene_intro.png',
    '/assets/room_childhood.png',
  ];
  await Promise.all(paths.map(p => loadImage(p)));
}
