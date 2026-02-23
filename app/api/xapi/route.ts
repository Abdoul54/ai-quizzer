// app/api/xapi/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const response = await fetch(process.env.LRS_ENDPOINT!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(
                    `${process.env.LRS_KEY}:${process.env.LRS_SECRET}`
                ).toString("base64")}`,
                "X-Experience-API-Version": "1.0.3", // 🔥 REQUIRED
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();

        console.log("LRS STATUS:", response.status);
        console.log("LRS RESPONSE:", text);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("XAPI ERROR:", err);
        return NextResponse.json({ error: "failed" }, { status: 500 });
    }
}