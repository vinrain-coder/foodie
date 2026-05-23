import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

import { getServerSession } from "@/lib/get-session";
import { extractUploadthingFileKey } from "@/lib/uploadthing-media";

const utapi = new UTApi();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z
  .object({
    url: z.string().trim().optional(),
    fileKey: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.url || value.fileKey), {
    message: "Provide either file URL or file key",
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = payloadSchema.parse(await req.json());
    const fileKey =
      payload.fileKey || (payload.url ? extractUploadthingFileKey(payload.url) : "");

    if (!fileKey) {
      return NextResponse.json(
        { success: false, message: "Invalid UploadThing URL or key" },
        { status: 400 },
      );
    }

    await utapi.deleteFiles(fileKey);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    console.error("Delete upload error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to delete file" },
      { status: 500 },
    );
  }
}
