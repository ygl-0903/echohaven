const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const LOWER_R = "abcdefghjkmnpqrstuvwxyz";
const UPPER_R = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export type GenOptions = {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  readable: boolean;
};

export function generatePassword(o: GenOptions): string {
  let pool = "";
  const low = o.readable ? LOWER_R : LOWER;
  const up = o.readable ? UPPER_R : UPPER;
  const dig = o.readable ? DIGITS : DIGITS;
  if (o.lower) pool += low;
  if (o.upper) pool += up;
  if (o.digits) pool += dig;
  if (o.symbols && !o.readable) pool += SYMBOLS;
  if (!pool) pool = low + up + dig;

  const out: string[] = [];
  const buf = new Uint32Array(o.length);
  crypto.getRandomValues(buf);
  for (let i = 0; i < o.length; i++) {
    out.push(pool[buf[i]! % pool.length]!);
  }
  return out.join("");
}
