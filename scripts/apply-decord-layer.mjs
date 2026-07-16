import { readFileSync, writeFileSync, existsSync } from "fs";

function patchCommon() {
    const path = "scripts/build/common.mjs";
    let t = readFileSync(path, "utf8");
    t = t.replace(
        /const pluginDirs = \[[^\]]*?\];/s,
        `const pluginDirs = [
                "plugins/_api", "plugins/_core", "plugins",
                "equicordplugins/_api", "equicordplugins/_core", "equicordplugins",
                "decplugins", "userplugins"
            ];`
    );
    t = t.replace(
        /const userPlugin = dir === "userplugins"[^;]*;/,
        'const userPlugin = dir === "userplugins";'
    );
    if (!t.includes("resolveGitHash") && t.includes("git rev-parse")) {
        t = t.replace(
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
    writeFileSync(path, t);
    console.log("common.mjs ok");
}

function patchConstants() {
    const path = "src/utils/constants.ts";
    let t = readFileSync(path, "utf8");
    if (!t.includes("./equicordDevs")) {
        t += `\nexport { EquicordDevs, EquicordDevsById } from "./equicordDevs";\n`;
    }
    if (!t.includes("DecordDevs")) {
        t += `
export const DecordDevs = /* #__PURE__*/ Object.freeze({
    Owner: { name: "Decord", id: 0n, badge: false },
} satisfies Record<string, Dev>);
`;
    }
    writeFileSync(path, t);
    console.log("constants ok");
}

function patchSettings() {
    const path = "src/plugins/_core/settings.tsx";
    let t = readFileSync(path, "utf8");
    t = t
        .replaceAll('title: "Vencord"', 'title: "Decord"')
        .replaceAll("Vencord Settings", "Decord Settings")
        .replaceAll("Vencord Updater", "Decord Updater")
        .replaceAll("Vencord Cloud", "Decord Cloud");
    writeFileSync(path, t);
    console.log("settings ok");
}

function patchApi() {
    const path = "src/api/index.ts";
    let t = readFileSync(path, "utf8");
    const extras = [
        ["./AudioPlayer", "$AudioPlayer", "AudioPlayer"],
        ["./HeaderBar", "$HeaderBar", "HeaderBar"],
        ["./UserArea", "$UserArea", "UserArea"],
        ["./GifPickerContextMenu", "$GifPickerContextMenu", "GifPickerContextMenu"],
    ];
    for (const [p, b, e] of extras) {
        if (!existsSync(`src/api/${p.slice(2)}.ts`) && !existsSync(`src/api/${p.slice(2)}.tsx`)) continue;
        if (!t.includes(`from "${p}"`)) {
            t = t.replace(
                'import * as $Commands from "./Commands";',
                `import * as $Commands from "./Commands";\nimport * as ${b} from "${p}";`
            );
        }
        if (!t.includes(`export const ${e}`)) t += `\nexport const ${e} = ${b};\n`;
    }
    writeFileSync(path, t);
    console.log("api ok");
}

patchCommon();
patchConstants();
patchSettings();
patchApi();
