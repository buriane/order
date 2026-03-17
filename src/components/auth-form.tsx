"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        if (!email || !password) {
            setError("Email dan password wajib diisi.");
            setLoading(false);
            return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            setLoading(false);
            return;
        }

        router.replace("/dashboard");
        router.refresh();
    }

    return (
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl shadow-[#00674F]/10">
            <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#00674F]">
                    Selamat Datang
                </p>
                <h1 className="mt-2 text-2xl font-bold text-zinc-900">Masuk ke Dashboard</h1>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">Email</span>
                    <input
                        type="email"
                        name="email"
                        required
                        className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 outline-none ring-[#00674F] transition focus:ring"
                        placeholder="email@gmail.com"
                    />
                </label>

                <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">
                        Password
                    </span>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            required
                            minLength={6}
                            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 pr-11 outline-none ring-[#00674F] transition focus:ring"
                            placeholder="******"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-[#00674F]"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                </label>

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#00674F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#005340] disabled:opacity-60"
                >
                    {loading ? "Memproses..." : "Masuk"}
                </button>
            </form>
        </div>
    );
}
