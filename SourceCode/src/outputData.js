const fs = require("fs");
const path = require("path");
const { generateFilename } = require("./utils");
const getStartEndDate = require("./getStartEndDate");

const saveToCSV = (data, outputPath) => {
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Generate filenames with proper CSV extension
    const part1Filename = path.join(outputPath, generateFilename("-Part-1", ".csv"));
    const part2Filename = path.join(outputPath, generateFilename("-Part-2", ".csv"));

    // Prepare Part-1 CSV (Production Names Only)
    const part1Data = data.flatMap(site =>
        site.shows.map(show => [show.title])
    );

    // Prepare Part-2 CSV (Detailed Show Data with Start & End Date)
    const part2Data = data.flatMap(site =>
        site.shows.map(show => {
            const { startDate, endDate } = getStartEndDate(show.date);
            const theatre = site.theatre?.length ? site.theatre : show.location || "Unknown Theatre";
            return [
                `"${show.title}"`,  // Wrap in quotes for CSV safety
                `"${theatre}"`,
                `"${startDate}"`,
                `"${endDate}"`,
                `"${show.link}"`
            ];
        })
    );

    // Convert arrays to CSV format (ensure proper line breaks)
    const part1Content = part1Data.map(row => row.join(",")).join("\n");
    const part2Content = part2Data.map(row => row.join(",")).join("\n");

    // Write Part-1 CSV
    fs.writeFileSync(part1Filename, "Show Name\n" + part1Content, "utf8");

    // Write Part-2 CSV (with correct headers)
    fs.writeFileSync(part2Filename, 'Show Name,Theatre Name,Start Date,End Date,Link\n' + part2Content, "utf8");

    return {
        part1: part1Filename,
        part2: part2Filename
    };
};

module.exports = { saveToCSV };
