import { randomBytes } from "node:crypto";

/**
 * 초대 토큰을 생성한다. 32바이트 URL-safe base64.
 * Node.js 서버에서만 호출 (randomBytes는 node:crypto).
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}
