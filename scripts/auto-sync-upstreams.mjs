#!/usr/bin/node
/**
 * Auto-sync for DecordOfficial/Decord (Vencord fork at repo root).
 *
 * Vencord  → src/plugins, src/webpack, src/api, src/components
 * Equicord → src/equicordplugins + API extras
 * Preserved → src/decplugins, Decord plugin browser UI
 *
 *   node scripts/auto-sync-upstreams.mjs
 */
import { execSync } from "child_process";
import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CONFIG = JSON.parse(
    readFileSync(join(ROOT, "scripts/sync-upstreams.config.json"), "utf8")
);

function run(cmd, cwd = ROOT) {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function ensureParent(p) {
    mkdirSync(dirname(p), { recursive: true });
}

function copyPath(from, to) {
    if (!existsSync(from)) {
        console.warn(`  skip missing: ${from}`);
        return false;
    }
    ensureParent(to);
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
    console.log(`  ok: ${to.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
    return true;
}

function backupPaths(paths, backupRoot) {
    for (const rel of paths) {
        const from = join(ROOT, rel);
        if (existsSync(from)) {
            const to = join(backupRoot, rel);
            ensureParent(to);
            cpSync(from, to, { recursive: true });
            console.log(`  backed up: ${rel}`);
        }
    }
}

function restorePaths(paths, backupRoot) {
    for (const rel of paths) {
        const from = join(backupRoot, rel);
        if (existsSync(from)) copyPath(from, join(ROOT, rel));
    }
}

function cloneShallow(repo, branch, dest) {
    run(`git clone --depth 1 --branch ${branch} "${repo}" "${dest}"`);
}

function ensureImportAndExport(text, importPath, binding, exportName) {
    const importLine = `import * as ${binding} from "${importPath}";`;
    if (!text.includes(`from "${importPath}"`)) {
        const anchor = 'import * as $Commands from "./Commands";';
        text = text.includes(anchor)
            ? text.replace(anchor, `${anchor}\n${importLine}`)
            : `${importLine}\n${text}`;
    }
    if (!text.includes(`export const ${exportName}`)) {
        text += `\n/** Equicord API */\nexport const ${exportName} = ${binding};\n`;
    }
    return text;
}

function patchApiIndex() {
    const file = join(ROOT, "src/api/index.ts");
    let text = readFileSync(file, "utf8");
    for (const [importPath, binding, exportName] of [
        ["./AudioPlayer", "$AudioPlayer", "AudioPlayer"],
        ["./HeaderBar", "$HeaderBar", "HeaderBar"],
        ["./UserArea", "$UserArea", "UserArea"],
        ["./GifPickerContextMenu", "$GifPickerContextMenu", "GifPickerContextMenu"],
    ]) {
        const base = join(ROOT, "src/api", importPath.slice(2));
        if (!existsSync(base + ".ts") && !existsSync(base + ".tsx")) continue;
        text = ensureImportAndExport(text, importPath, binding, exportName);
    }
    writeFileSync(file, text);
    console.log("  patched src/api/index.ts");
}

function ensureConstantsExports() {
    const file = join(ROOT, "src/utils/constants.ts");
    let text = readFileSync(file, "utf8");
    if (!text.includes("./equicordDevs")) {
        text += `\nexport { EquicordDevs, EquicordDevsById } from "./equicordDevs";\n`;
    }
    if (!text.includes("DecordDevs")) {
        text += `
/** Decord-exclusive plugin authors */
export const DecordDevs = /* #__PURE__*/ Object.freeze({
    Owner: {
        name: "Decord",
        id: 0n,
        badge: false
    },
} satisfies Record<string, Dev>);
`;
    }
    writeFileSync(file, text);
    console.log("  ensured constants exports");
}

function lightBrandSettings() {
    const file = join(ROOT, "src/plugins/_core/settings.tsx");
    if (!existsSync(file)) return;
    let text = readFileSync(file, "utf8");
    text = text
        .replaceAll('title: "Vencord"', 'title: "Decord"')
        .replaceAll("Vencord Settings", "Decord Settings")
        .replaceAll("Vencord Updater", "Decord Updater")
        .replaceAll("Vencord Cloud", "Decord Cloud");
    writeFileSync(file, text);
    console.log("  branded settings labels");
}

function ensurePluginDirsInBuild() {
    const file = join(ROOT, "scripts/build/common.mjs");
    let text = readFileSync(file, "utf8");
    if (!text.includes('"decplugins"') || !text.includes('"equicordplugins"')) {
        text = text.replace(
            /const pluginDirs = \[[^\]]*?\];/s,
            `const pluginDirs = [
                "plugins/_api", "plugins/_core", "plugins",
                "equicordplugins/_api", "equicordplugins/_core", "equicordplugins",
                "decplugins", "userplugins"
            ];`
        );
    }
    text = text.replace(
        /const userPlugin = dir === "userplugins"[^;]*;/,
        'const userPlugin = dir === "userplugins";'
    );

    // Soft git hash for CI
    if (!text.includes("resolveGitHash") && text.includes("git rev-parse --short HEAD")) {
        text = text.replace(
            /export const gitHash = process\.env\.VENCORD_HASH \|\| execSync\("git rev-parse --short HEAD"[^)]+\)\.trim\(\);/,
            `function resolveGitHash() {
    if (process.env.VENCORD_HASH || process.env.DECORD_HASH)
        return process.env.VENCORD_HASH || process.env.DECORD_HASH;
    try {
        return execSync("git rev-parse --short HEAD", {
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "ignore"]
        }).trim();
    } catch {
        return "unknown";
    }
}
export const gitHash = resolveGitHash();`
        );
    }

    writeFileSync(file, text);
    console.log("  ensured plugin dirs in build");
}

const tmp = mkdtempSync(join(tmpdir(), "decord-sync-"));
const backup = join(tmp, "backup");
const vencordDir = join(tmp, "vencord");
const equicordDir = join(tmp, "equicord");

try {
    console.log("\n=== Backup Decord-owned ===");
    backupPaths(CONFIG.preserve, backup);
    const apiExtrasBackup = join(backup, "_apiExtras");
    for (const rel of CONFIG.equicord.apiExtras) {
        const from = join(ROOT, rel);
        if (existsSync(from)) copyPath(from, join(apiExtrasBackup, rel));
    }
    if (existsSync(join(ROOT, "src/utils/equicordDevs.ts"))) {
        copyPath(join(ROOT, "src/utils/equicordDevs.ts"), join(backup, "src/utils/equicordDevs.ts"));
    }

    console.log("\n=== Clone Vencord ===");
    cloneShallow(CONFIG.vencord.repo, CONFIG.vencord.branch, vencordDir);

    console.log("\n=== Sync Vencord paths ===");
    for (const rel of CONFIG.vencord.paths) {
        copyPath(join(vencordDir, rel), join(ROOT, rel));
    }

    console.log("\n=== Clone Equicord ===");
    cloneShallow(CONFIG.equicord.repo, CONFIG.equicord.branch, equicordDir);

    console.log("\n=== Sync Equicord ===");
    copyPath(join(equicordDir, "src/equicordplugins"), join(ROOT, "src/equicordplugins"));
    for (const rel of CONFIG.equicord.apiExtras) {
        const from = join(equicordDir, rel);
        if (existsSync(from)) copyPath(from, join(ROOT, rel));
        else if (existsSync(join(apiExtrasBackup, rel))) copyPath(join(apiExtrasBackup, rel), join(ROOT, rel));
    }
    const equiDevs = join(equicordDir, "src/utils/equicordDevs.ts");
    if (existsSync(equiDevs)) copyPath(equiDevs, join(ROOT, "src/utils/equicordDevs.ts"));
    else if (existsSync(join(backup, "src/utils/equicordDevs.ts"))) {
        copyPath(join(backup, "src/utils/equicordDevs.ts"), join(ROOT, "src/utils/equicordDevs.ts"));
    }

    console.log("\n=== Restore Decord-owned ===");
    restorePaths(CONFIG.preserve, backup);

    console.log("\n=== Post fixes ===");
    patchApiIndex();
    ensureConstantsExports();
    lightBrandSettings();
    ensurePluginDirsInBuild();

    console.log("\nAuto-sync complete for DecordOfficial/Decord");
} finally {
    rmSync(tmp, { recursive: true, force: true });
}
