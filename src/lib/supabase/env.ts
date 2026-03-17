function isValidHttpUrl(value: string | undefined) {
    if (!value) {
        return false;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function getSupabaseEnv() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error(
            "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
    }

    if (!isValidHttpUrl(url)) {
        throw new Error(
            "Invalid NEXT_PUBLIC_SUPABASE_URL. Use full URL format, e.g. https://your-project-ref.supabase.co",
        );
    }

    return { url, anonKey };
}
