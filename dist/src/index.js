#!/usr/bin/env node
/**
 * Focus Flow – The Fun Edition
 *  focus          → start timer
 *  focus history  → view last 10 sessions
 */
import * as p from "@clack/prompts";
import pc from "picocolors";
import box from "cli-boxes";
import notifier from "node-notifier";
import fs from "node:fs";
import { setTimeout } from "node:timers/promises";
/* ---------- UTILS ---------- */
const sleep = (ms) => setTimeout(ms);
/* ---------- SIMPLE GRADIENT ENGINE ---------- */
// convert hex → rgb
const hexToRgb = (hex) => {
    const clean = hex.replace("#", "");
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
    };
};
// interpolate between two values
const interpolate = (start, end, factor) => Math.round(start + (end - start) * factor);
// apply gradient to string
const makeGradient = (text, startHex, endHex) => {
    if (!text)
        return "";
    const start = hexToRgb(startHex);
    const end = hexToRgb(endHex);
    return text
        .split("")
        .map((char, i, arr) => {
        const factor = arr.length === 1 ? 0 : i / (arr.length - 1);
        const r = interpolate(start.r, end.r, factor);
        const g = interpolate(start.g, end.g, factor);
        const b = interpolate(start.b, end.b, factor);
        return `\x1b[38;2;${r};${g};${b}m${char}\x1b[0m`;
    })
        .join("");
};
// multiline gradient
const makeMultilineGradient = (text, startHex, endHex) => text
    .split("\n")
    .map((line) => makeGradient(line, startHex, endHex))
    .join("\n");
/* ---------- QUOTE BANK ---------- */
const MOTIVATIONS = [
    "Planting the seeds of tomorrow… 🌱",
    "Deep work > shallow likes 💪",
    "One pomodoro at a time 🍅",
    "Flow state activated ✨",
    "You're crushing it! 🔥",
    "Almost there—keep the vibe alive 🌊",
];
/* ---------- REWARD BANNER ---------- */
const VICTORY = makeMultilineGradient(`
╭───────────────────────────╮
│   🎉  SESSION COMPLETE  🎉   │
│   Time to recharge! ⚡     │
╰───────────────────────────╯
`, "#a18cd1", "#fbc2eb");
/* ---------- PRETTY BOX ---------- */
const prettyBox = (text, colour) => colour(box.round + text + box.round);
/* ---------- HISTORY ---------- */
async function showHistory() {
    p.intro(prettyBox(" 📜  FOCUS HISTORY ", pc.magenta));
    if (!fs.existsSync("focus-log.txt")) {
        p.log.warn("No history yet—start your first session!");
        p.outro("Go get 'em! 🚀");
        return;
    }
    const data = fs.readFileSync("focus-log.txt", "utf-8").trim().split("\n");
    const last = data.slice(-10).reverse();
    let out = "";
    last.forEach((l) => {
        const [date, details] = l.split("] ");
        out += `${pc.dim(date + "]")}  ${pc.cyan(details)}\n`;
    });
    p.note(out, "Last 10 Sessions");
    p.outro(makeGradient("Keep up the great work!", "#89f7fe", "#66a6ff"));
}
/* ---------- TIMER WITH STYLE ---------- */
async function startTimer() {
    console.clear();
    p.intro(makeMultilineGradient("🍅  F O C U S  F L O W  🍅", "#ff9a9e", "#fad0c4"));
    const project = await p.group({
        task: () => p.text({
            message: "What are you focusing on?",
            placeholder: "Building awesome CLI tools",
            validate: (v) => (!v ? "Task name required" : undefined),
        }),
        duration: () => p.select({
            message: "How long is the session?",
            options: [
                { value: 0.1, label: "6s Speed Test" },
                { value: 25, label: "25 min Pomodoro" },
                { value: 50, label: "50 min Deep Work" },
            ],
        }),
    }, { onCancel: () => process.exit(0) });
    const session = project;
    const totalSeconds = Math.floor(session.duration * 60);
    let remaining = totalSeconds;
    /* progress-bar helpers */
    const barLength = 30;
    const formatBar = (percent) => {
        const filled = Math.round(percent * barLength);
        return (pc.green("█".repeat(filled)) + pc.gray("░".repeat(barLength - filled)));
    };
    p.log.info(makeGradient(`Starting: ${session.task} (${session.duration} min)`, "#89f7fe", "#66a6ff"));
    while (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
        const percent = 1 - remaining / totalSeconds;
        // random motivation every 30s
        if (remaining % 30 === 0 && remaining !== totalSeconds) {
            p.log.message(makeGradient(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)], "#ff6a00", "#ee0979"));
        }
        process.stdout.write(`\r${formatBar(percent)}  ${pc.bold(timeStr)}  ${remaining <= 10 ? pc.red("⚡ final sprint") : ""}`);
        await sleep(1000);
        remaining--;
    }
    console.log("");
    /* victory */
    console.log(VICTORY);
    notifier.notify({
        title: "Focus Flow",
        message: `✨ Session finished: ${session.task}`,
        sound: true,
    });
    /* log */
    const logEntry = `[${new Date().toLocaleString()}] ${session.task} (${session.duration}m)\n`;
    fs.appendFileSync("focus-log.txt", logEntry);
    p.outro(makeGradient("Take a well-deserved break! 🌴", "#f7971e", "#ffd200"));
}
/* ---------- ENTRY ---------- */
(async () => {
    const args = process.argv.slice(2);
    if (args.includes("history"))
        await showHistory();
    else
        await startTimer();
})().catch((err) => {
    p.log.error(`An error occurred: ${err.message}`);
    process.exit(1);
});
