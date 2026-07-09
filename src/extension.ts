import * as vscode from 'vscode';
import { LanguageClient, ServerOptions, TransportKind, LanguageClientOptions } from 'vscode-languageclient/node';
import * as path from 'path';

let client: LanguageClient;
const isSelfClosing = require('is-self-closing');

export function activate(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'server.js'));

    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'amml' }]
    };

    client = new LanguageClient(
        'ammlLanguageServer',
        'AMML Language Server',
        serverOptions,
        clientOptions
    );

    client.start();
    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document.languageId !== 'amml') return;
        if (event.contentChanges.length === 0) return;

        const change = event.contentChanges[0];

        if (change.text === '>') {
            const position = change.range.start.translate(0, 1);
            const linePrefix = event.document.lineAt(position.line).text.substring(0, position.character);

            const match = linePrefix.match(/<([a-zA-Z0-9_-]+)>$/);

            if (match) {
                const tagName = match[1];

                if (!isSelfClosing(tagName)) {
                    editor.edit(editBuilder => {
                        editBuilder.insert(position, `</${tagName}>`);
                    }, { undoStopBefore: false, undoStopAfter: false }).then(() => {
                        editor.selection = new vscode.Selection(position, position);
                    });
                }
            }
        }
    }, null, context.subscriptions);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}