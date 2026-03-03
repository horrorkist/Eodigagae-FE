import { NextRequest } from "next/server";
import {
  parseTrashBinsRequest,
  proxyFacilityRequest,
  toValidationErrorResponse,
} from "@/lib/facilityProxy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const parsed = parseTrashBinsRequest(req.nextUrl.searchParams);
  if (!parsed.ok) return toValidationErrorResponse(parsed.message);

  return proxyFacilityRequest("trash-bins", parsed.value);
}
