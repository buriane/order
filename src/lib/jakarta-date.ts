export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export function getJakartaDateString(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: JAKARTA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
        throw new Error("Failed to format Jakarta date.");
    }

    return `${year}-${month}-${day}`;
}
