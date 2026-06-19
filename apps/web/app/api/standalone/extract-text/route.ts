import { extractText, getDocumentProxy } from "unpdf";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return typeof text === "string" ? text : (text as string[]).join("\n");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ detail: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file instanceof File ? file.name : "upload";
    const lower = name.toLowerCase();
    let text = "";

    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      text = await extractPdfText(buffer);
    } else if (lower.endsWith(".docx") || file.type.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else {
      return NextResponse.json(
        { detail: "Only PDF and DOCX files are supported" },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        {
          detail:
            "No text found in this file. If it's a scanned PDF (image only), try a text-based PDF or DOCX.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim(), fileName: name });
  } catch (err) {
    console.error("extract-text error:", err);
    const msg = err instanceof Error ? err.message : "Failed to parse CV";
    return NextResponse.json({ detail: `PDF read failed: ${msg}` }, { status: 500 });
  }
}
