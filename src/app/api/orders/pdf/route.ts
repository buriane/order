import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

type PdfEntry = {
    item_id: string;
    leftover_qty: number;
    order_qty: number;
    note: string | null;
};

type PdfItem = {
    id: string;
    name: string;
    unit: string;
};

function parsePrice(value: string | null) {
    if (!value) {
        return null;
    }

    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
        return null;
    }

    return parsed;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const reportDate = searchParams.get("reportDate");
    const orderForDate = searchParams.get("orderForDate");

    if (!reportDate || !orderForDate) {
        return NextResponse.json({ error: "Tanggal tidak lengkap." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.role !== "owner") {
        return NextResponse.json({ error: "Hanya pemilik yang bisa cetak PDF." }, { status: 403 });
    }

    const { data: entries } = await supabase
        .from("inventory_entries")
        .select("item_id,leftover_qty,order_qty,note")
        .eq("report_date", reportDate)
        .eq("order_for_date", orderForDate)
        .order("created_at");

    const itemIds = ((entries ?? []) as PdfEntry[]).map((entry) => entry.item_id);
    const { data: items } = itemIds.length
        ? await supabase.from("items").select("id,name,unit").in("id", itemIds)
        : { data: [] as PdfItem[] };

    const itemById = new Map(((items ?? []) as PdfItem[]).map((item) => [item.id, item]));

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText("Order Bahan", {
        x: 40,
        y: 560,
        size: 20,
        font: fontBold,
        color: rgb(0.12, 0.12, 0.12),
    });

    page.drawText(`Laporan sisa: ${reportDate} | Order untuk: ${orderForDate}`, {
        x: 40,
        y: 540,
        size: 11,
        font,
        color: rgb(0.25, 0.25, 0.25),
    });

    const printableRows = ((entries ?? []) as PdfEntry[])
        .map((entry) => {
            const item = itemById.get(entry.item_id);
            const price = parsePrice(entry.note);
            return {
                item,
                orderQty: entry.order_qty,
                price,
            };
        })
        .filter((row) => row.item && row.price !== null);

    const noteTotal = printableRows.reduce((acc, row) => acc + Number(row.price ?? 0), 0);

    const headers = ["Barang", "Satuan", "Order", "Harga Beli"];
    const colX = [40, 300, 420, 520];
    let y = 510;

    headers.forEach((header, i) => {
        page.drawText(header, { x: colX[i], y, size: 11, font: fontBold });
    });

    y -= 12;
    page.drawLine({
        start: { x: 40, y },
        end: { x: 800, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });

    y -= 18;

    printableRows.forEach((row, index) => {
        const rowY = y - index * 18;
        if (rowY < 50) {
            return;
        }

        page.drawText(String(row.item?.name ?? "-"), { x: colX[0], y: rowY, size: 10, font });
        page.drawText(String(row.item?.unit ?? "-"), { x: colX[1], y: rowY, size: 10, font });
        page.drawText(String(row.orderQty ?? 0), { x: colX[2], y: rowY, size: 10, font });
        page.drawText(String(row.price ?? 0), { x: colX[3], y: rowY, size: 10, font });
    });

    const totalY = Math.max(y - printableRows.length * 18 - 16, 50);
    page.drawLine({
        start: { x: 40, y: totalY + 10 },
        end: { x: 800, y: totalY + 10 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText(`Total harga beli: ${noteTotal}`, {
        x: 520,
        y: totalY - 6,
        size: 11,
        font: fontBold,
    });

    if (printableRows.length === 0) {
        page.drawText("Tidak ada data catatan harga beli untuk tanggal ini.", {
            x: 40,
            y: 470,
            size: 11,
            font,
            color: rgb(0.35, 0.35, 0.35),
        });
    }

    const bytes = await pdf.save();
    const buffer = Buffer.from(bytes);

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="order-${orderForDate}.pdf"`,
        },
    });
}

export async function POST(request: Request) {
    return GET(request);
}
