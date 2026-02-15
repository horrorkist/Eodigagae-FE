import { hasBatchim } from "es-hangul";

export function attachJosa(str: string) {
  return hasBatchim(str) ? str + "이에게는" : str + "에게는";
}

export function getJosa(str: string) {
  return hasBatchim(str) ? "이에게는" : "에게는";
}
