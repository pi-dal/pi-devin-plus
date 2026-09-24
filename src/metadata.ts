import { existsSync, readFileSync } from "node:fs";
import {
  encodeMessage,
  encodeString,
  encodeTimestampBody,
  encodeVarintField,
} from "./wire.js";
import { runDevin } from "./cli.js";

/**
 * Cognition gates Devin Local-only models (every GPT-5.6 variant: Sol, Terra,
 * Luna) by client ide name. With ide="windsurf" GetChatMessage rejects them
 * with "This model is only in Devin Local."; with ide="devin-desktop" the
 * server serves them and the response header echoes the exact model
 * (verified: "GPT-5.6 Sol High Thinking" for gpt-5-6-sol-high, 2026-08-29).
 */
const FALLBACK_WINDSURF_VERSION = "3.7.0";
const PRODUCT_JSON =
  "/Applications/Devin.app/Contents/Resources/app/product.json";

function desktopWindsurfVersion(): string {
  try {
    if (!existsSync(PRODUCT_JSON)) return FALLBACK_WINDSURF_VERSION;
    const product = JSON.parse(readFileSync(PRODUCT_JSON, "utf8")) as {
      windsurfVersion?: string;
    };
    return product.windsurfVersion || FALLBACK_WINDSURF_VERSION;
  } catch {
    return FALLBACK_WINDSURF_VERSION;
  }
}

export const CLIENT_VERSION = desktopWindsurfVersion();
export const CLIENT_IDE = "devin-desktop";

export interface ClientIdentity {
  ide: string;
  version: string;
}

let cachedIdentity: ClientIdentity | null = null;

/**
 * Cognition enforces a minimum client version server-side (observed 2026-09-23:
 * "Your Windsurf version is out of date" against a stale devin-desktop
 * version). The Devin CLI itself always passes its own gate, so prefer the
 * CLI's real identity (ide "devin-cli" + its reported version) whenever the
 * binary is available, and fall back to the Desktop identity otherwise.
 */
export async function resolveClientIdentity(): Promise<ClientIdentity> {
  if (cachedIdentity) return cachedIdentity;
  try {
    const { stdout, code } = await runDevin(["--version"], { timeoutMs: 8_000 });
    if (code === 0) {
      const match = stdout.match(/\d+\.\d+\.\d+/);
      if (match) {
        cachedIdentity = { ide: "devin-cli", version: match[0] };
        return cachedIdentity;
      }
    }
  } catch {
    // fall through to the Desktop identity
  }
  cachedIdentity = { ide: CLIENT_IDE, version: desktopWindsurfVersion() };
  return cachedIdentity;
}

export interface MetadataInput {
  apiKey: string;
  userJwt?: string;
  sessionId: string;
  requestId: bigint;
  triggerId: string;
  version?: string;
  ide?: string;
}

export function buildMetadata(input: MetadataInput): Buffer {
  const version = input.version ?? CLIENT_VERSION;
  const ide = input.ide ?? CLIENT_IDE;
  const os =
    process.platform === "darwin"
      ? "darwin"
      : process.platform === "win32"
        ? "windows"
        : "linux";
  const parts: Buffer[] = [
    encodeString(1, ide),
    encodeString(2, version),
    encodeString(3, input.apiKey),
    encodeString(4, "en"),
    encodeString(5, os),
    encodeString(7, version),
    encodeVarintField(9, input.requestId),
    encodeString(10, input.sessionId),
    encodeString(12, ide),
    encodeMessage(16, encodeTimestampBody()),
    encodeString(25, input.triggerId),
    encodeString(26, "Unset"),
    encodeString(28, ide),
  ];
  if (input.userJwt) parts.push(encodeString(21, input.userJwt));
  return Buffer.concat(parts);
}
