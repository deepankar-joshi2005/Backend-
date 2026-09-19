"use strict";
/** @format */
Object.defineProperty(exports, "__esModule", { value: true });
exports.monthBounds = monthBounds;
exports.defaultRunTitle = defaultRunTitle;
/** Given "YYYY-MM", returns the first/last calendar day as "YYYY-MM-DD". */
function monthBounds(month) {
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    return {
        start: `${month}-01`,
        end: `${month}-${String(lastDay).padStart(2, "0")}`,
    };
}
/** Given "YYYY-MM", returns a default run title like "August 2026 Payroll". */
function defaultRunTitle(month) {
    const [year, mon] = month.split("-").map(Number);
    const label = new Date(year, mon - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
    return `${label} Payroll`;
}
