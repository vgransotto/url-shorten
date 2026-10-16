import Hashids from "hashids";
import { env } from "../config/env";

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
const ID_LENGTH = 4;

const hashids = new Hashids(env.SECRET_KEY, ID_LENGTH, ALPHABET);

export function generateId(sequence: number): string {
  return hashids.encode(sequence);
}
