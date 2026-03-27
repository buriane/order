"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OwnerNotificationListenerProps = {
    ownerUserId: string;
    todayDate: string;
    todayOrderDate: string;
    todayLabel: string;
    initialCount: number;
};

type NotificationPermissionState = "checking" | "unsupported" | NotificationPermission;

type NotificationRow = {
    created_by: string;
    updated_by: string | null;
};

function playNotificationSound() {
    try {
        const audioContext = new window.AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.22);
    } catch {
        // Ignore audio errors caused by browser autoplay policies.
    }
}

export function OwnerNotificationListener({
    ownerUserId,
    todayDate,
    todayOrderDate,
    todayLabel,
    initialCount,
}: OwnerNotificationListenerProps) {
    const lastEntryCountRef = useRef(initialCount);
    const [popupMessage, setPopupMessage] = useState<string | null>(null);
    const [permissionOverride, setPermissionOverride] = useState<NotificationPermissionState | null>(null);
    const detectedPermission = useSyncExternalStore(
        () => () => undefined,
        () => {
            if (!("Notification" in window)) {
                return "unsupported";
            }

            return window.Notification.permission;
        },
        () => "checking",
    );
    const permission = permissionOverride ?? detectedPermission;

    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        let mounted = true;
        const timeoutIds: number[] = [];

        async function pollLatestOwnerNotification() {
            const { data, error } = await supabase
                .from("inventory_entries")
                .select("created_by,updated_by")
                .eq("report_date", todayDate)
                .eq("order_for_date", todayOrderDate);

            if (!mounted || error) {
                return;
            }

            const rows = (data ?? []) as NotificationRow[];
            const nextCount = rows.filter(
                (row) => row.created_by !== ownerUserId || (row.updated_by && row.updated_by !== ownerUserId),
            ).length;

            if (nextCount > lastEntryCountRef.current) {
                const diff = nextCount - lastEntryCountRef.current;
                const message = `Input baru ${diff} entri. Total ${nextCount} entri untuk ${todayLabel}.`;
                setPopupMessage(message);
                playNotificationSound();

                if (permission === "granted") {
                    new window.Notification("Notifikasi Input Pegawai", {
                        body: message,
                        tag: `owner-notif-${todayDate}`,
                    });
                }

                const timeoutId = window.setTimeout(() => setPopupMessage(null), 6000);
                timeoutIds.push(timeoutId);
            }

            lastEntryCountRef.current = nextCount;
        }

        const intervalId = window.setInterval(pollLatestOwnerNotification, 60_000);

        return () => {
            mounted = false;
            window.clearInterval(intervalId);
            timeoutIds.forEach((id) => window.clearTimeout(id));
        };
    }, [ownerUserId, permission, supabase, todayDate, todayLabel, todayOrderDate]);

    async function enableBrowserNotification() {
        if (!("Notification" in window)) {
            setPermissionOverride("unsupported");
            return;
        }

        const result = await window.Notification.requestPermission();
        setPermissionOverride(result);
    }

    return (
        <>
            {popupMessage ? (
                <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-[#00674F]/30 bg-white px-4 py-3 shadow-lg">
                    <div className="flex items-start gap-2 text-sm text-zinc-700">
                        <BellRing className="mt-0.5 h-4 w-4 text-[#00674F]" />
                        <p>{popupMessage}</p>
                    </div>
                </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span>Notifikasi popup HP/browser aktif jika izin notifikasi diaktifkan.</span>
                {permission === "granted" ? (
                    <span className="rounded-full bg-[#00674F]/10 px-2 py-1 font-semibold text-[#00674F]">
                        Izin notifikasi aktif
                    </span>
                ) : permission === "checking" ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-600">
                        Memeriksa dukungan notifikasi...
                    </span>
                ) : permission === "unsupported" ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-1 font-semibold text-zinc-600">
                        Browser tidak mendukung notifikasi
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={enableBrowserNotification}
                        className="rounded-full bg-[#00674F] px-3 py-1 font-semibold text-white hover:bg-[#005340]"
                    >
                        Aktifkan Notifikasi Popup
                    </button>
                )}
            </div>
        </>
    );
}
