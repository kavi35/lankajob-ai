import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text || "";
      await parser.destroy();
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
        { detail: "Could not extract text from this file" },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.trim(), fileName: name });
  } catch (err) {
    console.error("extract-text error:", err);
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Failed to parse CV" },
      { status: 500 }
    );
  }
}
