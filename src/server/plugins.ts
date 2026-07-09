import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Hover } from 'vscode-languageserver/node';

let pluginCache: Record<string, any> = {};

function escapeHtml(unsafe: string) {
    return unsafe.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function loadPlugins(progress?: any) {
    try {
        const repoApi = "https://api.github.com/repos/javascript-system/amml/contents/lang/plugins";
        const { data: files } = await axios.get(repoApi);
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amml-plugins-'));

        let count = 0;
        for (const file of files) {
            if (file.name.endsWith('.js')) {
                if (progress) {
                    const percent = Math.min(10 + Math.floor((count / files.length) * 85), 95);
                    progress.report(percent, `Reading plugin ${file.name}`);
                }

                const { data: content } = await axios.get(file.download_url);
                const match = content.match(/^\/\*\*@plugin\s+([a-zA-Z0-9_-]+)\*\//);

                if (match) {
                    const pluginName = match[1];
                    const filePath = path.join(tmpDir, file.name);
                    fs.writeFileSync(filePath, content);
                    try {
                        const pluginData = require(filePath);
                        pluginCache[pluginName] = { ...pluginData, _filename: file.name };
                    } catch (requireErr) {
                        console.error(`Error loading plugin ${pluginName}:`, requireErr);
                    }
                }
                count++;
            }
        }
        console.log("Plugins loaded");
    } catch (error) {
        console.error("Error searching GitHub plugins:", error);
    }
}

export function getPluginHover(lineText: string, character: number): Hover | null {
    const regex = /<!([a-zA-Z0-9_-]+)(?:[:(])/g;
    let match;

    while ((match = regex.exec(lineText)) !== null) {
        const startIndex = match.index + 2;
        const pluginName = match[1];
        const endIndex = startIndex + pluginName.length;

        if (character >= startIndex && character <= endIndex) {
            const plugin = pluginCache[pluginName];

            if (plugin) {
                const safeDescription = plugin.description ? escapeHtml(plugin.description) : 'No description provided.';
                const githubUrl = `https://github.com/javascript-system/amml/blob/main/lang/plugins/${plugin._filename}`;

                return {
                    contents: {
                        kind: 'markdown',
                        value: [
                            `### AMML Plugin: [${plugin.name || pluginName}](${githubUrl})`,
                            `*Version: ${plugin.version || '1.0.0'} | Author: ${plugin.author || 'Unknown'}*`,
                            `___`,
                            `${safeDescription}`,
                            `___`,
                            `**Requires internet:** \`${plugin.dependencies?.requiresInternet || "false"}\``,
                            `**Required commands:** \`${plugin.dependencies?.commands?.length ? plugin.dependencies.commands.join(', ') : 'N/A'}\``,
                            `___`,
                            `**Supports:** \`${plugin.supports ? plugin.supports.join(', ') : 'N/A'}\``,
                            `**Example:** \`${plugin.example || ''}\``,
                            `___`,
                            `*File: \`${plugin._filename}\`*`
                        ].join('\n\n')
                    }
                };
            } else {
                return {
                    contents: {
                        kind: 'markdown',
                        value: `**Plugin not found in the default plugins list.**\n\nMake sure that it's installed, else an *Unknown plugin* error will be threwd.`
                    }
                };
            }
        }
    }
    return null;
}