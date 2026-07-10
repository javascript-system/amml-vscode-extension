import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionList, CompletionItem, CompletionItemKind, Diagnostic, DiagnosticSeverity, Position, Hover } from 'vscode-languageserver';
const tsLibDirectory = path.dirname(require.resolve('typescript'));

const compilerOptions: ts.CompilerOptions = {
  allowJs: true,
  checkJs: false,
  skipLibCheck: true,
  noEmit: true,
  target: ts.ScriptTarget.Latest,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true
};


let currentContent = '';
let currentVersion = 0;

const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => {
        const defaultLib = ts.getDefaultLibFileName(compilerOptions);
        return ['virtual.js', defaultLib];
    },
    
    getScriptVersion: (fileName) => {
        if (fileName === 'virtual.js') return currentVersion.toString();
        return '1';
    },

    getScriptSnapshot: (fileName) => {
        if (fileName === 'virtual.js') {
            return ts.ScriptSnapshot.fromString(currentContent);
        }
        const resolvedPath = path.isAbsolute(fileName) ? fileName : path.join(tsLibDirectory, fileName);
        if (fs.existsSync(resolvedPath)) {
            return ts.ScriptSnapshot.fromString(fs.readFileSync(resolvedPath, 'utf8'));
        }
        return undefined;
    },
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) => {
        if (fileName === 'virtual.js') return true;
        const resolvedPath = path.isAbsolute(fileName) ? fileName : path.join(tsLibDirectory, fileName);
        return fs.existsSync(resolvedPath);
    },
    
    readFile: (fileName) => {
        if (fileName === 'virtual.js') return currentContent;
        const resolvedPath = path.isAbsolute(fileName) ? fileName : path.join(tsLibDirectory, fileName);
        if (fs.existsSync(resolvedPath)) {
            return fs.readFileSync(resolvedPath, 'utf8');
        }
        return '';
    },
    
    readDirectory: () => [],
    directoryExists: () => true,
    getDirectories: () => []
};

const tsService = ts.createLanguageService(host);

function updateVirtualFile(text: string) {
    currentContent = text;
    currentVersion++;
}

export function getJSCompletions(virtualDoc: TextDocument, position: Position): CompletionList | null {
    updateVirtualFile(virtualDoc.getText());
    const offset = virtualDoc.offsetAt(position);

    const completions = tsService.getCompletionsAtPosition('virtual.js', offset, undefined);
    if (!completions) return null;

    const items: CompletionItem[] = completions.entries.map(entry => ({
        label: entry.name,
        kind: convertTsKindToLspKind(entry.kind),
        sortText: entry.sortText
    }));

    return { isIncomplete: false, items };
}

export function getJSHover(virtualDoc: TextDocument, position: Position): Hover | null {
    updateVirtualFile(virtualDoc.getText());
    const offset = virtualDoc.offsetAt(position);

    const info = tsService.getQuickInfoAtPosition('virtual.js', offset);
    if (!info) return null;

    const displayString = ts.displayPartsToString(info.displayParts);
    const docString = ts.displayPartsToString(info.documentation);

    return {
        contents: {
            kind: 'markdown',
            value: [`\`\`\`typescript\n${displayString}\n\`\`\``, docString].filter(Boolean).join('\n\n---\n\n')
        }
    };
}

export function getJSDiagnostics(virtualDoc: TextDocument): Diagnostic[] {
    updateVirtualFile(virtualDoc.getText());

    const syntaticErrors = tsService.getSyntacticDiagnostics('virtual.js');
    const semanticErrors = tsService.getSemanticDiagnostics('virtual.js');
    const allErrors = [...syntaticErrors, ...semanticErrors];

    const filteredErrors = allErrors.filter(err => {
        if (err.code >= 7000 && err.code <= 7030) return false;
        if (err.code >= 80000) return false;
        return true;
    });

    return filteredErrors.map(err => {
        const start = virtualDoc.positionAt(err.start || 0);
        const end = virtualDoc.positionAt((err.start || 0) + (err.length || 0));
        const isWarning = err.code === 6133 || err.category === ts.DiagnosticCategory.Warning;

        return {
            range: { start, end },
            severity: isWarning ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
            message: ts.flattenDiagnosticMessageText(err.messageText, '\n'),
            source: 'AMML-JS'
        };
    });
}

function convertTsKindToLspKind(kind: ts.ScriptElementKind): CompletionItemKind {
    switch (kind) {
        case ts.ScriptElementKind.functionElement: return CompletionItemKind.Function;
        case ts.ScriptElementKind.memberFunctionElement: return CompletionItemKind.Method;
        case ts.ScriptElementKind.variableElement: return CompletionItemKind.Variable;
        case ts.ScriptElementKind.classElement: return CompletionItemKind.Class;
        case ts.ScriptElementKind.keyword: return CompletionItemKind.Keyword;
        default: return CompletionItemKind.Property;
    }
}
