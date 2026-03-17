"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

export function DashboardAutoDaySync() {
    const router = useRouter();

    useEffect(() => {
        let active = true;
        const initialDay = getTodayString();

        const intervalId = window.setInterval(() => {
            const currentDay = getTodayString();
            if (active && currentDay !== initialDay) {
                router.replace("/dashboard");
                router.refresh();
                active = false;
            }
        }, 60_000);

        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, [router]);

    return null;
}
