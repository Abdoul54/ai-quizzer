import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const getLabel = (idx: number) => {
  const letter = alphabets[idx % 26];

  if (idx < 26) {
    return letter;
  }

  return `${letter}${idx - 25}`;
};


export const parseDuration = (iso?: string): string => {
  if (!iso) return "—"
  const seconds = parseInt(iso.replace("PT", "").replace("S", ""))
  if (isNaN(seconds)) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export const getInitials = (name?: string) => {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}