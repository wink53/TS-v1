import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforms a sprite URL to use the /assets/ prefix if it's a relative path
 */
export function getSpriteUrl(spriteUrl: string | undefined | null): string | null {
  if (!spriteUrl) return null;
  
  // If already an absolute URL or starts with /, return as-is
  if (spriteUrl.startsWith('http') || spriteUrl.startsWith('/')) {
    return spriteUrl;
  }
  
  // Otherwise, prepend /assets/
  return `/assets/${spriteUrl}`;
}
