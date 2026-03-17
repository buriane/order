"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type ConfirmSubmitButtonProps = {
    formId: string;
    triggerLabel: string;
    triggerClassName: string;
    title: string;
    description?: string;
    confirmLabel?: string;
    loadingLabel?: string;
    cancelLabel?: string;
};

export function ConfirmSubmitButton({
    formId,
    triggerLabel,
    triggerClassName,
    title,
    description,
    confirmLabel = "Ya, lanjutkan",
    loadingLabel = "Memproses...",
    cancelLabel = "Tidak",
}: ConfirmSubmitButtonProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleConfirm() {
        setIsSubmitting(true);
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
            form.requestSubmit();
        }
        setOpen(false);
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={triggerClassName}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {loadingLabel}
                    </span>
                ) : (
                    triggerLabel
                )}
            </button>

            {open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                        <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
                        {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={isSubmitting}
                                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {loadingLabel}
                                    </>
                                ) : (
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
