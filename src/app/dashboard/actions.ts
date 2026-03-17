"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserWithRole } from "@/lib/auth";

const itemSchema = z.object({
    name: z.string().min(2).max(100),
    unit: z.string().min(1).max(20),
});

const itemUpdateSchema = z.object({
    itemId: z.string().uuid(),
    name: z.string().min(2).max(100),
    unit: z.string().min(1).max(20),
});

const itemDeleteSchema = z.object({
    itemId: z.string().uuid(),
});

const bulkEntrySchema = z.object({
    reportDate: z.string().date(),
    orderForDate: z.string().date(),
    itemIds: z.string().min(1),
});

function parseQtyInput(value: string): number | null {
    const normalized = value.trim();

    if (normalized === "-") {
        return 0;
    }

    const parsed = Number(normalized);
    if (Number.isNaN(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

export async function addItemAction(formData: FormData) {
    const { role, supabase } = await requireUserWithRole();

    if (role !== "owner") {
        return;
    }

    const parsed = itemSchema.safeParse({
        name: formData.get("name"),
        unit: formData.get("unit"),
    });

    if (!parsed.success) {
        return;
    }

    await supabase.from("items").insert({
        name: parsed.data.name.trim(),
        unit: parsed.data.unit.trim().toLowerCase(),
    });

    revalidatePath("/dashboard");
}

export async function updateItemAction(formData: FormData) {
    const { role, supabase } = await requireUserWithRole();

    if (role !== "owner") {
        return;
    }

    const parsed = itemUpdateSchema.safeParse({
        itemId: formData.get("itemId"),
        name: formData.get("name"),
        unit: formData.get("unit"),
    });

    if (!parsed.success) {
        return;
    }

    await supabase
        .from("items")
        .update({
            name: parsed.data.name.trim(),
            unit: parsed.data.unit.trim().toLowerCase(),
        })
        .eq("id", parsed.data.itemId);

    revalidatePath("/dashboard");
}

export async function deleteItemAction(formData: FormData) {
    const { role, supabase } = await requireUserWithRole();

    if (role !== "owner") {
        return;
    }

    const parsed = itemDeleteSchema.safeParse({
        itemId: formData.get("itemId"),
    });

    if (!parsed.success) {
        return;
    }

    // Soft delete to keep historical entries intact.
    await supabase.from("items").update({ is_active: false }).eq("id", parsed.data.itemId);

    revalidatePath("/dashboard");
}

export async function bulkUpsertInventoryAction(formData: FormData) {
    const { role, user, supabase } = await requireUserWithRole();

    const parsed = bulkEntrySchema.safeParse({
        reportDate: formData.get("reportDate"),
        orderForDate: formData.get("orderForDate"),
        itemIds: formData.get("itemIds"),
    });

    if (!parsed.success) {
        return;
    }

    const itemIds = parsed.data.itemIds
        .split(",")
        .map((itemId) => itemId.trim())
        .filter((itemId) => itemId.length > 0);

    if (itemIds.length === 0) {
        return;
    }

    for (const itemId of itemIds) {
        const leftoverRaw = String(formData.get(`leftoverQty__${itemId}`) ?? "").trim();
        const orderRaw = String(formData.get(`orderQty__${itemId}`) ?? "").trim();
        const noteRaw = role === "owner" ? String(formData.get(`note__${itemId}`) ?? "").trim() : "";

        if (!leftoverRaw || !orderRaw) {
            continue;
        }

        const leftoverQty = parseQtyInput(leftoverRaw);
        const orderQty = parseQtyInput(orderRaw);

        if (leftoverQty === null || orderQty === null) {
            continue;
        }

        const updatePayload = {
            leftover_qty: leftoverQty,
            order_qty: orderQty,
            note: noteRaw || null,
            updated_by: user.id,
        };

        const { data: updatedRows, error: updateError } = await supabase
            .from("inventory_entries")
            .update(updatePayload)
            .eq("item_id", itemId)
            .eq("report_date", parsed.data.reportDate)
            .eq("order_for_date", parsed.data.orderForDate)
            .select("id")
            .limit(1);

        if (updateError) {
            continue;
        }

        if (!updatedRows || updatedRows.length === 0) {
            await supabase.from("inventory_entries").insert({
                item_id: itemId,
                report_date: parsed.data.reportDate,
                order_for_date: parsed.data.orderForDate,
                created_by: user.id,
                ...updatePayload,
            });
        }
    }

    revalidatePath("/dashboard");
}

export async function signOutAction() {
    const { supabase } = await requireUserWithRole();
    await supabase.auth.signOut();
    redirect("/login");
}
