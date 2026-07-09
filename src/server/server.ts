import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    HoverParams,
    Hover,
    CompletionParams,
    CompletionList,
    TextEdit,
    Range
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getAMMLDiagnostics, getAMMLHover } from './amml';
import { getEmbeddedHover, getEmbeddedCompletion, getEmbeddedDiagnostics } from './intelliSense';
import { getLanguageService } from 'vscode-html-languageservice';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let pluginCache: Record<string, any> = {};

function escapeHtml(unsafe: string) {
    return unsafe.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function loadPlugins(progress?: any) {
    try {
        const repoApi = "https://api.github.com/repos/javascript-system/amml/contents/lang/plugins";
        const { data: files } = await axios.get(repoApi, { timeout: 5000 });
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amml-plugins-'));

        let count = 0;
        for (const file of files) {
            if (file.name.endsWith('.js')) {
                const percentage = Math.floor((count / files.length) * 100);
                progress.report(percentage, `Reading plugin ${file.name}`);

                const { data: content } = await axios.get(file.download_url, { timeout: 5000 });
                const match = content.match(/^\/\*\*@plugin\s+([a-zA-Z0-9_-]+)\*\//);

                if (match) {
                    const pluginName = match[1];
                    const filePath = path.join(tmpDir, file.name);
                    fs.writeFileSync(filePath, content);
                    try {
                        const pluginData = require(filePath);
                        pluginCache[pluginName] = {
                            ...pluginData,
                            _filename: file.name
                        };
                    } catch (requireErr) {
                        console.error(`Error loading plugin ${pluginName}:`, requireErr);
                    }
                }
                count++;
            }
        }
        console.log("Plugins loaded successfully.");
    } catch (error) {
        console.error("Error fetching GitHub plugins:", error);
    }
}

connection.onInitialize(() => {
    return {
        capabilities: {
            hoverProvider: true,
            textDocumentSync: 1,
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['.', '"', "'", '/', '<', ' ', ':']
            },
            documentFormattingProvider: true
        }
    };
});

connection.onInitialized(() => {
    connection.window.createWorkDoneProgress().then(progress => {
        progress.begin('AMML Engine', 0, 'Starting plugins download...');
        loadPlugins(progress).finally(() => progress.done());
    });
});

const htmlLanguageService = getLanguageService();

connection.onDocumentFormatting((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    try {
        const text = document.getText();
        let virtualText = text
            .replace("<javascript", '<script js')
            .replace("</javascript>", '</script js>')
            .replace("<css", '<style css')
            .replace("</css>", '</style css>')
            .replace(/<!AMML\b/gi, '<!DOCTYPE html');
        const virtualDoc = TextDocument.create(document.uri, 'html', document.version, virtualText);
        const htmlEdits = htmlLanguageService.format(virtualDoc, undefined, params.options);
        if (!htmlEdits || htmlEdits.length === 0) return [];
        let sortedEdits = [...htmlEdits].sort((a, b) => {
            const startA = virtualDoc.offsetAt(a.range.start);
            const startB = virtualDoc.offsetAt(b.range.start);
            return startB - startA;
        });

        let formattedVirtualText = virtualText;
        for (const edit of sortedEdits) {
            const start = virtualDoc.offsetAt(edit.range.start);
            const end = virtualDoc.offsetAt(edit.range.end);
            formattedVirtualText = formattedVirtualText.substring(0, start) + edit.newText + formattedVirtualText.substring(end);
        }
        let finalAMMLText = formattedVirtualText
            .replaceAll("<script js", '<javascript')
            .replaceAll("</script js>", '</javascript>')
            .replace("<style css", '<css')
            .replace("</style css>", '</css>')
            .replace(/<!DOCTYPE html\b/gi, '<!AMML');

        const fullRange = Range.create(
            document.positionAt(0),
            document.positionAt(text.length)
        );

        return [TextEdit.replace(fullRange, finalAMMLText)];

    } catch (err) {
        console.error("Error formating amml document:", err);
        return [];
    }
});

documents.onDidChangeContent((change) => {
    try {
        const embeddedDiagnostics = getEmbeddedDiagnostics(change.document);
        const ammlDiagnostics = getAMMLDiagnostics(change.document);

        connection.sendDiagnostics({
            uri: change.document.uri,
            diagnostics: [...embeddedDiagnostics, ...ammlDiagnostics]
        });
    } catch (err) {
        console.error("Error on onDidChangeContent:", err);
    }
});

connection.onCompletion((params: CompletionParams): CompletionList | null => {
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;
        return getEmbeddedCompletion(document, params.position);
    } catch (err) {
        console.error("Error onCompletion:", err);
        return null;
    }
});

connection.onHover((params: HoverParams): Hover | null => {
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) return null;

        const text = document.getText();
        const lines = text.split(/\r?\n/);
        const lineText = lines[params.position.line];

        if (lineText) {
            const regex = /<!([a-zA-Z0-9_-]+)(?:[:(])/g;
            let match;

            while ((match = regex.exec(lineText)) !== null) {
                const startIndex = match.index + 2;
                const pluginName = match[1];
                const endIndex = startIndex + pluginName.length;

                if (params.position.character >= startIndex && params.position.character <= endIndex) {
                    const plugin = pluginCache[pluginName];

                    if (plugin) {
                        const safeDescription = plugin.description
                            ? escapeHtml(plugin.description)
                            : 'No description provided.';

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
                                    `**Required commands:** \`${plugin.dependencies?.commands ? plugin.dependencies.commands.length > 0 ? plugin.dependencies.commands.join(', ') : 'N/A' : 'N/A'}\``,
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
        }

        const embeddedHover = getEmbeddedHover(document, params.position);
        if (embeddedHover) return embeddedHover;

        const ammlHover = getAMMLHover(document, params.position);
        if (ammlHover) return ammlHover;

    } catch (err) {
        console.error("Error on onHover:", err);
    }
    return null;
});

documents.listen(connection);
connection.listen();