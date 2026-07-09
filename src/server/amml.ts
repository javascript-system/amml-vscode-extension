import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, DiagnosticSeverity, Hover, Position } from 'vscode-languageserver';

const ignorePattern = `#(?:<!).*|"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\``;
const metaTagRegex = new RegExp(`${ignorePattern}|(<!AMML(?:\\s+(\\d+\\.\\d+\\.\\d+))?(?:\\s+(?:"([^"]*)"|'([^']*)'|(module)))?\\s*>|<!AMML\\s+(?:"([^"]*)"|'([^']*)'|(module))\\s+(\\d+\\.\\d+\\.\\d+)\\s*>)`, "g");
const strictMetaCheck = new RegExp(`^\\s*(?:${metaTagRegex.source})`);

const AMML_HOVER_DESCRIPTIONS: Record<string, string> = {
  "AMML": "**<!AMML>**\n\nThe main file declaration tag. Defines the version and the structural scope type.",
  "interface": "**<interface>**\n\nThe main visual rendering block. Contains the element tree of the page.",
  "window": "**<window/>**\n\nConfigures native window properties. MUST be self-closing.",
  "javascript": "**<javascript>**\n\nEmbedded logical script block for data and event handling.",
  "script": "**<script>**\n\nInjection or importation of external scripts into the execution tree.",
  "css": "**<css>**\n\nEmbedded visual styling block dedicated to local elements.",
  "file": "**<file/>**\n\nDeclaration or linking of external file resources. MUST be self-closing."
};

export function getAMMLHover(document: TextDocument, position: Position): Hover | null {
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const lineText = lines[position.line];
    if (!lineText) return null;

    const tagRegex = /(<!AMML|<\/?(interface|window|javascript|script|css|file))\b/g;
    let match;

    while ((match = tagRegex.exec(lineText)) !== null) {
        const isMeta = match[1].startsWith('<!');
        const isClosing = match[1].startsWith('</');
        const startIndex = match.index + (isClosing ? 2 : isMeta ? 2 : 1);
        const tagName = match[2] || 'AMML';
        const endIndex = startIndex + tagName.length;

        if (position.character >= startIndex && position.character <= endIndex) {
            return {
                contents: {
                    kind: 'markdown',
                    value: AMML_HOVER_DESCRIPTIONS[tagName] || `Tag \`${tagName}\` do AMML.`
                }
            };
        }
    }
    return null;
}

export function getAMMLDiagnostics(document: TextDocument): Diagnostic[] {
    const text = document.getText();
    let diagnostics: Diagnostic[] = [];

    const metaMatch = text.match(strictMetaCheck);
    let docType = 'auto';

    if (!metaMatch || !metaMatch[1]) {
        diagnostics.push({
            range: { start: document.positionAt(0), end: document.positionAt(Math.min(10, text.length)) },
            message: 'The file must start with the metadata tag <!AMML>.',
            severity: DiagnosticSeverity.Error,
            source: 'AMML Engine'
        });
    } else {
        const typeVal = metaMatch[3] || metaMatch[4] || metaMatch[5] || metaMatch[6] || metaMatch[7] || metaMatch[8] || '';
        if (typeVal === '') {
            docType = 'auto';
        } else if (['master', 'component', 'module'].includes(typeVal)) {
            docType = typeVal;
        } else {
            docType = 'invalid';
            const startPos = document.positionAt(text.indexOf('<!AMML'));
            const endPos = document.positionAt(metaMatch[0].length);
            diagnostics.push({
                range: { start: startPos, end: endPos },
                message: `Invalid metadata type '${typeVal}'. Valid types: master, component, or module (leaving empty will assign as auto).`,
                severity: DiagnosticSeverity.Error,
                source: 'AMML Engine'
            });
        }
    }

    const elementRegex = /<![a-zA-Z0-9_-]+[\s\S]*?>|<(\/?)([a-zA-Z0-9_-]+)([^>]*?)(\/?)>/g;
    let tagMatch;
    let depth = 0;

    let countInterface = 0;
    let countWindow = 0;

    while ((tagMatch = elementRegex.exec(text)) !== null) {
        if (tagMatch[2]) {
            const isClosing = tagMatch[1] === '/';
            const tagName = tagMatch[2];
            const isSelfClosing = tagMatch[4] === '/';

            if (depth === 0 && !isClosing) {
                const startPos = document.positionAt(tagMatch.index);
                const endPos = document.positionAt(tagMatch.index + tagMatch[0].length);
                const range = { start: startPos, end: endPos };
                const reportError = (msg: string) => diagnostics.push({ range, message: msg, severity: DiagnosticSeverity.Error, source: 'AMML Engine' });

                switch (docType) {
                    case 'master':
                        if (tagName === 'window') {
                            if (!isSelfClosing) reportError('The <window/> tag must have self-closing.');
                            countWindow++;
                            if (countWindow > 1) reportError('Only one <window/> tag are permited on the root.');
                        } else if (tagName === 'interface') {
                            if (isSelfClosing) reportError('The <interface> tag must not have self-closing.');
                            countInterface++;
                            if (countInterface > 1) reportError('Only one <interface> tag are permited on the root.');
                        } else {
                            reportError(`The tag <${tagName}> cannot be used in a master file root.`);
                        }
                        break;
                    case 'component':
                        if (tagName === 'interface') {
                            if (isSelfClosing) reportError('The <interface> tag must not have self-closing.');
                            countInterface++;
                            if (countInterface > 1) reportError('Only one <interface> tag are permited on the root.');
                        } else {
                            reportError(`The tag <${tagName}> cannot be used in a component file root.`);
                        }
                        break;
                    case 'module':
                        if (['javascript', 'css', 'script'].includes(tagName)) {
                            if (isSelfClosing) reportError(`The <${tagName}> tag must not have self-closing.`);
                        } else if (tagName === 'file') {
                            if (!isSelfClosing) reportError('The <file/> tag must have self-closing.');
                        } else {
                            reportError(`The tag <${tagName}> cannot be used in a module file root.`);
                        }
                        break;
                    case 'auto':
                        if (tagName === 'window') {
                            if (!isSelfClosing) reportError('The <window/> tag must have self-closing.');
                        } else if (['css', 'javascript', 'script', 'interface'].includes(tagName)) {
                            if (isSelfClosing) reportError(`The <${tagName}> tag must not have self-closing.`);
                        } else {
                            reportError(`Unknown tag <${tagName}> cannot be used in a auto file type.`);
                        }
                        break;
                }
            }

            if (!isSelfClosing) {
                if (isClosing) depth--; else depth++;
            }
        }
    }

    return diagnostics;
}