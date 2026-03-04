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