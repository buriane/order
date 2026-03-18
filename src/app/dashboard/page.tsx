import { addDays, format, isValid, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { BellRing, PackageOpen, Printer, ShoppingCart } from "lucide-react";
import { requireUserWithRole } from "@/lib/auth";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DashboardAutoDaySync } from "@/components/dashboard-auto-day-sync";
import { OwnerNotificationListener } from "@/components/owner-notification-listener";
import { getJakartaDateString } from "@/lib/jakarta-date";
import {
    addItemAction,
    bulkUpsertInventoryAction,
    deleteItemAction,
    signOutAction,
    updateItemAction,
} from "./actions";

type DashboardProps = {
    searchParams?: Promise<{
        reportDate?: string;
    }>;
};

type Item = {
    id: string;
    name: string;
    unit: string;
};

type Entry = {
    item_id: string;
    leftover_qty: number;
    order_qty: number;
    note: string | null;
    created_by: string;
    updated_by: string | null;
};

function isValidDateInput(value?: string) {
    if (!value) {
        return false;
    }

    const parsed = parseISO(value);
    return isValid(parsed) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
    const { role, user, supabase } = await requireUserWithRole();

    const todayDate = getJakartaDateString();
    const todayOrderDate = format(addDays(parseISO(todayDate), 1), "yyyy-MM-dd");

    const resolvedSearch = (await searchParams) ?? {};
    const selectedReportDate =
        role === "owner" && isValidDateInput(resolvedSearch.reportDate)
            ? resolvedSearch.reportDate!
            : todayDate;
    const selectedReportDateObj = parseISO(selectedReportDate);
    const selectedOrderDate = format(addDays(selectedReportDateObj, 1), "yyyy-MM-dd");
    const todayLabel = format(parseISO(todayDate), "EEEE, dd MMMM yyyy", { locale: id });

    const ownerNotificationPromise =
        role === "owner"
            ? supabase
                .from("inventory_entries")
                .select("created_by,updated_by")
                .eq("report_date", todayDate)
                .eq("order_for_date", todayOrderDate)
            : Promise.resolve({ data: null as Array<{ created_by: string; updated_by: string | null }> | null });

    const [{ data: itemsRaw }, { data: entriesRaw }, { data: profile }, { data: todayEntriesRaw }] =
        await Promise.all([
            supabase.from("items").select("id,name,unit").eq("is_active", true).order("name"),
            supabase
                .from("inventory_entries")
                .select("item_id,leftover_qty,order_qty,note,created_by,updated_by")
                .eq("report_date", selectedReportDate)
                .eq("order_for_date", selectedOrderDate),
            supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            ownerNotificationPromise,
        ]);

    const items = (itemsRaw ?? []) as Item[];
    const entries = (entriesRaw ?? []) as Entry[];
    const todayEntries = todayEntriesRaw ?? [];
    const entriesByItemId = new Map(entries.map((entry) => [entry.item_id, entry]));

    const employeeInputCountToday =
        role === "owner"
            ? todayEntries.filter(
                (entry) => entry.created_by !== user.id || (entry.updated_by && entry.updated_by !== user.id),
            ).length
            : 0;

    const totalItems = items.length;
    const addItemFormId = "add-item-form";
    const bulkSaveFormId = "bulk-save-form";
    const logoutFormId = "logout-form";

    return (
        <main className="min-h-screen bg-[linear-gradient(145deg,#e8f7f1_0%,#f3fbf8_42%,#d9efe8_100%)] p-4 md:p-8">
            <DashboardAutoDaySync />
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-3xl border border-[#00674F]/25 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#00674F]">
                                Dashboard Harian
                            </p>
                            <h1 className="mt-2 text-3xl font-black text-zinc-900">Order RM. KARANGKOBAR</h1>
                            <p className="mt-1 text-zinc-600">
                                Laporan: {format(selectedReportDateObj, "EEEE, dd MMMM yyyy", { locale: id })} -
                                Order untuk {format(parseISO(selectedOrderDate), "dd MMMM yyyy", { locale: id })}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#00674F]/10 px-3 py-1 text-sm font-semibold text-[#00674F]">
                                {profile?.full_name ?? user.email}
                            </span>
                            <form id={logoutFormId} action={signOutAction}>
                            </form>
                            <ConfirmSubmitButton
                                formId={logoutFormId}
                                triggerLabel="Logout"
                                triggerClassName="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                                title="Konfirmasi logout"
                                description="Yakin ingin keluar dari aplikasi?"
                            />
                        </div>
                    </div>
                </section>

                {role === "owner" && employeeInputCountToday > 0 ? (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                        <div className="flex items-center gap-2">
                            <BellRing className="h-5 w-5" />
                            <p className="text-sm font-semibold">
                                Notifikasi: pegawai sudah menginput data pada {todayLabel} ({employeeInputCountToday} entri).
                            </p>
                        </div>
                    </section>
                ) : null}

                {role === "owner" ? (
                    <OwnerNotificationListener
                        ownerUserId={user.id}
                        todayDate={todayDate}
                        todayOrderDate={todayOrderDate}
                        todayLabel={todayLabel}
                        initialCount={employeeInputCountToday}
                    />
                ) : null}

                <section className="grid gap-4 md:grid-cols-1">
                    <div className="rounded-2xl border border-[#00674F]/25 bg-white p-5">
                        <p className="text-sm text-zinc-500">Jumlah barang/bahan</p>
                        <p className="mt-2 text-3xl font-black text-zinc-900">{totalItems}</p>
                    </div>
                </section>

                {role === "owner" ? (
                    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <PackageOpen className="h-5 w-5 text-[#00674F]" />
                            <h2 className="text-lg font-bold text-zinc-900">Input Barang/Bahan</h2>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                            <form id={addItemFormId} action={addItemAction} className="space-y-3 rounded-xl border border-zinc-200 p-4">
                                <p className="text-sm font-semibold text-zinc-800">Tambah Barang/Bahan</p>
                                <input
                                    name="name"
                                    required
                                    placeholder="Nama barang/bahan"
                                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none ring-[#00674F] focus:ring"
                                />
                                <input
                                    name="unit"
                                    required
                                    placeholder="Satuan (kg, pcs, biji, dll)"
                                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none ring-[#00674F] focus:ring"
                                />
                                <ConfirmSubmitButton
                                    formId={addItemFormId}
                                    triggerLabel="Simpan Barang/Bahan Baru"
                                    triggerClassName="w-full rounded-xl bg-[#00674F] py-2.5 text-sm font-semibold text-white hover:bg-[#005340]"
                                    title="Konfirmasi simpan barang/bahan"
                                    description="Yakin ingin menambahkan barang/bahan baru?"
                                />
                            </form>

                            <div className="overflow-x-auto rounded-xl border border-zinc-200">
                                <table className="w-full min-w-152 text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-600">
                                            <th className="px-3 py-2">Nama</th>
                                            <th className="px-3 py-2">Satuan</th>
                                            <th className="px-3 py-2">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => {
                                            const editFormId = `edit-item-${item.id}`;

                                            return (
                                                <tr key={item.id} className="border-b border-zinc-100">
                                                    <td className="px-3 py-2">
                                                        <form id={editFormId} action={updateItemAction}>
                                                            <input type="hidden" name="itemId" value={item.id} />
                                                            <input
                                                                name="name"
                                                                defaultValue={item.name}
                                                                required
                                                                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                                                            />
                                                        </form>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            form={editFormId}
                                                            name="unit"
                                                            defaultValue={item.unit}
                                                            required
                                                            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex gap-2">
                                                            <ConfirmSubmitButton
                                                                formId={editFormId}
                                                                triggerLabel="Update"
                                                                triggerClassName="rounded-lg bg-[#00674F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005340]"
                                                                title="Konfirmasi update barang/bahan"
                                                                description="Yakin ingin menyimpan perubahan nama/satuan barang/bahan ini?"
                                                            />
                                                            <form id={`delete-item-${item.id}`} action={deleteItemAction}>
                                                                <input type="hidden" name="itemId" value={item.id} />
                                                            </form>
                                                            <ConfirmSubmitButton
                                                                formId={`delete-item-${item.id}`}
                                                                triggerLabel="Hapus"
                                                                triggerClassName="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                                                                title="Konfirmasi hapus barang/bahan"
                                                                description="Barang/bahan akan dinonaktifkan. Lanjutkan?"
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-[#00674F]" />
                            <h2 className="text-lg font-bold text-zinc-900">Input Tabel Sisa & Order</h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {role === "owner" ? (
                                <form method="get" className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-2 py-2">
                                    <label htmlFor="reportDate" className="text-xs font-semibold text-zinc-600">
                                        Lihat tanggal:
                                    </label>
                                    <input
                                        id="reportDate"
                                        name="reportDate"
                                        type="date"
                                        defaultValue={selectedReportDate}
                                        className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                                    />
                                    <button className="rounded-lg bg-[#00674F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005340]">
                                        Tampilkan
                                    </button>
                                </form>
                            ) : null}

                            {role === "owner" ? (
                                <a
                                    href={`/api/orders/pdf?reportDate=${selectedReportDate}&orderForDate=${selectedOrderDate}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
                                >
                                    <Printer className="h-4 w-4" />
                                    Cetak PDF Tanggal Ini
                                </a>
                            ) : null}
                        </div>
                    </div>

                    <p className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        Isi kolom <strong>Sisa</strong> dan <strong>Order</strong> dengan angka atau tanda <strong>-</strong> &nbsp;.
                        {role === "owner" ? (
                            <>
                                {" "}  &nbsp; Kolom <strong>Harga Beli</strong> boleh kosong. &nbsp; Gunakan tombol  &nbsp; <strong>Simpan Semua</strong> &nbsp;
                                untuk menyimpan seluruh perubahan.
                            </>
                        ) : (
                            <>  &nbsp; Gunakan tombol <strong>Simpan Semua</strong> untuk menyimpan seluruh perubahan.</>
                        )}
                    </p>

                    {items.length === 0 ? (
                        <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">
                            {role === "owner"
                                ? "Belum ada barang/bahan. Tambahkan barang/bahan terlebih dahulu."
                                : "Belum ada barang/bahan dari pemilik."}
                        </p>
                    ) : (
                        <form id={bulkSaveFormId} action={bulkUpsertInventoryAction}>
                            <input type="hidden" name="reportDate" value={selectedReportDate} />
                            <input type="hidden" name="orderForDate" value={selectedOrderDate} />
                            <input type="hidden" name="itemIds" value={items.map((item) => item.id).join(",")} />

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-4xl text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-200 text-left text-zinc-500">
                                            <th className="py-3 pr-3">Barang/Bahan</th>
                                            <th className="py-3 pr-3">Satuan</th>
                                            <th className="py-3 pr-3">Sisa</th>
                                            <th className="py-3 pr-3">Order</th>
                                            {role === "owner" ? <th className="py-3 pr-3">Harga Beli</th> : null}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => {
                                            const entry = entriesByItemId.get(item.id);

                                            return (
                                                <tr key={item.id} className="border-b border-zinc-100 align-top">
                                                    <td className="py-3 pr-3 font-semibold text-zinc-800">{item.name}</td>
                                                    <td className="py-3 pr-3 text-zinc-600">{item.unit}</td>
                                                    <td className="py-3 pr-3">
                                                        <input
                                                            name={`leftoverQty__${item.id}`}
                                                            required
                                                            type="text"
                                                            defaultValue={entry ? String(entry.leftover_qty) : "-"}
                                                            placeholder="contoh: 3 atau -"
                                                            className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5"
                                                        />
                                                    </td>
                                                    <td className="py-3 pr-3">
                                                        <input
                                                            name={`orderQty__${item.id}`}
                                                            required
                                                            type="text"
                                                            defaultValue={entry ? String(entry.order_qty) : "-"}
                                                            placeholder="contoh: 2 atau -"
                                                            className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5"
                                                        />
                                                    </td>
                                                    {role === "owner" ? (
                                                        <td className="py-3 pr-3">
                                                            <input
                                                                name={`note__${item.id}`}
                                                                type="text"
                                                                defaultValue={entry?.note ?? ""}
                                                                placeholder="Harga beli (angka), opsional"
                                                                className="w-full min-w-52 rounded-lg border border-zinc-200 px-2 py-1.5"
                                                            />
                                                        </td>
                                                    ) : null}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex justify-end">
                                <ConfirmSubmitButton
                                    formId={bulkSaveFormId}
                                    triggerLabel="Simpan Semua"
                                    triggerClassName="rounded-xl bg-[#00674F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005340]"
                                    title="Konfirmasi simpan semua"
                                    description="Yakin ingin menyimpan semua perubahan data sisa/order pada tabel ini?"
                                />
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}
