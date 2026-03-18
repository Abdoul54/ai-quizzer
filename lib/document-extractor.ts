import mammoth from "mammoth";
import ExcelJS from "exceljs";
import OfficeParser from "officeparser";
import { extractPdfText } from "@/lib/pdf";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

export type SupportedMimeType =
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    | "text/plain"
    | "text/markdown";

export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/markdown",
];

export function isSupportedMimeType(type: string): type is SupportedMimeType {
    return SUPPORTED_MIME_TYPES.includes(type as SupportedMimeType);
}

export async function extractText(buffer: Uint8Array, mimeType: string): Promise<string> {
    switch (mimeType) {
        case "application/pdf": {
            const { text } = await extractPdfText(buffer);
            return text;
        }

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
            const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
            return value;
        }

        case "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
            // officeparser's types only accept a file path string, so write to a
            // temp file, parse it, then clean up unconditionally.
            const tmpPath = join(tmpdir(), `pptx-${randomBytes(8).toString("hex")}.pptx`);
            writeFileSync(tmpPath, buffer);
            try {
                return await new Promise<string>((resolve, reject) => {
                    OfficeParser.parseOffice(tmpPath, (data: string, err: Error) => {
                        if (err) reject(err);
                        else resolve(String(data));
                    });
                });
            } finally {
                unlinkSync(tmpPath);
            }
        }

        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer.buffer as ArrayBuffer);
            const sections: string[] = [];
            workbook.eachSheet((sheet) => {
                const rows: string[] = [];
                sheet.eachRow((row) => {
                    const cells = (row.values as ExcelJS.CellValue[])
                        .slice(1) // eachRow values are 1-indexed, index 0 is always null
                        .map((v) => (v == null ? "" : String(v)));
                    rows.push(cells.join(", "));
                });
                sections.push(`[Sheet: ${sheet.name}]\n${rows.join("\n")}`);
            });
            return sections.join("\n\n");
        }

        case "text/plain":
        case "text/markdown": {
            return Buffer.from(buffer).toString("utf-8");
        }

        default:
            throw new Error(`Unsupported file type: ${mimeType}`);
    }
}