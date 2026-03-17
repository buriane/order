import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
    return (
        <main className="min-h-screen bg-[linear-gradient(145deg,#e8f7f1_0%,#f3fbf8_42%,#d9efe8_100%)] p-4 md:p-8">
            <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
                <div className="inline-flex translate-y-10 items-center gap-3 rounded-2xl bg-[#00674F]/10 px-5 py-3 text-[#00674F] md:translate-y-14">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-semibold">Memuat data dashboard...</span>
                </div>
            </div>
        </main>
    );
}
