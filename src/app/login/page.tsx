import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect("/dashboard");
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9f7ee_0%,#d9efe8_35%,#fff_75%)] px-4 py-10">
            <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center rounded-4xl border border-[#00674F]/25 bg-white/70 p-6 backdrop-blur md:p-10">
                <div className="grid w-full items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
                    <section>
                        <p className="inline-block rounded-full bg-[#00674F]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#00674F]">
                            RM. KARANGKOBAR
                        </p>
                        <h2 className="mt-4 text-4xl font-black leading-tight text-zinc-900">
                            Kontrol Stok & Order Barang
                        </h2>
                        <p className="mt-4 max-w-xl text-zinc-700">
                            Pantau stok bahan baku dan catat order dengan mudah melalui dashboard.
                        </p>
                    </section>

                    <AuthForm />
                </div>
            </div>
        </main>
    );
}
