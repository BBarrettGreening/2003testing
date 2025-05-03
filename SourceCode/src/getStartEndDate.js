/**
 * Extracts start and end dates from a given date string.
 * Handles various date formats seen in JSON output.
 */
const getStartEndDate = (dateStr) => {
    if (!dateStr) return { startDate: "", endDate: "" };

    let startDate = "";
    let endDate = "";

    const formatDate = (d) => {
        const [day, month, year] = d.split("/");
        const dateObj = new Date(`${year}-${month}-${day}`);
        return dateObj.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    // Format: "02/05/2025 - 10/05/2025"
    let match = dateStr.match(/^(\d{2}\/\d{2}\/\d{4}) - (\d{2}\/\d{2}\/\d{4})$/);
    if (match) {
        return {startDate: formatDate(match[1]), endDate: formatDate(match[2]) };
    }

    // Format: "6 February - 20 April"
    match = dateStr.match(/^(\d{1,2} \w+) - (\d{1,2} \w+)$/);
    if (match) {
        return { startDate: match[1], endDate: match[2] };
    }

    // Format: "6 February 2025 - 20 April 2025"
    match = dateStr.match(/^(\d{1,2} \w+ \d{4}) - (\d{1,2} \w+ \d{4})$/);
    if (match) {
        return { startDate: match[1], endDate: match[2] };
    }

    // Format: "Until Sun 26 Oct 2025"
    match = dateStr.match(/^Until .*?(\d{1,2} \w+ \d{4})$/);
    if (match) {
        return { startDate: "", endDate: match[1] };
    }

    // Format: "Sat 1 Feb 2025 - Sat 30 May 2026"
    match = dateStr.match(/^(?:\w+ )?(\d{1,2} \w+ \d{4}) - (?:\w+ )?(\d{1,2} \w+ \d{4})$/);
    if (match) {
        return { startDate: match[1], endDate: match[2] };
    }

    // Format: "Mon 10 February 2025 - Sat 5 April 2025"
    match = dateStr.match(/^(?:\w+ )?(\d{1,2} \w+ \d{4}) - (?:\w+ )?(\d{1,2} \w+ \d{4})$/);
    if (match) {
        return { startDate: match[1], endDate: match[2] };
    }

    // Single date: "Sun 9 February 2025" → Extracts just the date
    match = dateStr.match(/(?:\w+ )?(\d{1,2} \w+ \d{4})$/);
    if (match) {
        return { startDate: match[1], endDate: "" };
    }

    // Tickets format (e.g., "Tickets from £25") → No valid dates
    if (/tickets from/i.test(dateStr)) {
        return { startDate: "", endDate: "" };
    }

    return { startDate: dateStr, endDate: "" };
};

module.exports = getStartEndDate;
