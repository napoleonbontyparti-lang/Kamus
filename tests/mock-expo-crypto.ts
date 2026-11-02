import { randomBytes, createHash } from "node:crypto";
export const getRandomBytes = (n: number) => new Uint8Array(randomBytes(n));
export enum CryptoDigestAlgorithm { SHA256 = "SHA-256" }
export const digestStringAsync = async (_a: string, s: string) => createHash("sha256").update(s).digest("hex");
