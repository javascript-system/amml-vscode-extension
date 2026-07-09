import { TextDocument } from 'vscode-languageserver-textdocument';
import { Hover, Position, CompletionList, Diagnostic } from 'vscode-languageserver';
import { getLanguageService as getHTMLLanguageService } from 'vscode-html-languageservice';
import { getCSSLanguageService } from 'vscode-css-languageservice';
import { getJSCompletions, getJSDiagnostics, getJSHover } from './javascriptService';

const htmlLanguageService = getHTMLLanguageService();
const cssLanguageService = getCSSLanguageService();

function getVirtualHTMLDocument(document: TextDocument): TextDocument {
    let text = document.getText();
    text = text.replace(/<javascript\b/gi, '<script    ');
    text = text.replace(/<\/javascript>/gi, '</script>   ');
    text = text.replace(/<css\b/gi, '<style');
    text = text.replace(/<\/css>/gi, '</style>');
    return TextDocument.create(document.uri, 'html', document.version, text);
}

function getContextAtPosition(document: TextDocument, position: Position): { type: 'css' | 'javascript' | 'html', virtualDoc?: TextDocument } {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const cssRegex = /<(style|css)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = cssRegex.exec(text)) !== null) {
        const start = match.index + match[0].indexOf('>') + 1;
        const end = start + match[3].length;
        if (offset >= start && offset <= end) {
            let mask = text.replace(/[^\r\n]/g, ' ');
            mask = mask.substring(0, start) + match[3] + mask.substring(end);
            const virtualDoc = TextDocument.create(document.uri, 'css', document.version, mask);
            return { type: 'css', virtualDoc };
        }
    }
    
    const jsRegex = /<(script|javascript)([^>]*)>([\s\S]*?)<\/\1>/gi;
    while ((match = jsRegex.exec(text)) !== null) {
        const start = match.index + match[0].indexOf('>') + 1;
        const end = start + match[3].length;
        if (offset >= start && offset <= end) {
            let mask = text.replace(/[^\r\n]/g, ' ');
            mask = mask.substring(0, start) + match[3] + mask.substring(end);
            const virtualDoc = TextDocument.create(document.uri, 'javascript', document.version, mask);
            return { type: 'javascript', virtualDoc };
        }
    }
    
    return { type: 'html' };
}

export function getEmbeddedHover(document: TextDocument, position: Position): Hover | null {
    const context = getContextAtPosition(document, position);
    
    if (context.type === 'css' && context.virtualDoc) {
        const stylesheet = cssLanguageService.parseStylesheet(context.virtualDoc);
        return cssLanguageService.doHover(context.virtualDoc, position, stylesheet);
        
    } else if (context.type === 'javascript' && context.virtualDoc) {
        return getJSHover(context.virtualDoc, position); // Chama seu novo Hover de JS!
        
    } else {
        const htmlDoc = getVirtualHTMLDocument(document);
        const parsedHTML = htmlLanguageService.parseHTMLDocument(htmlDoc);
        return htmlLanguageService.doHover(htmlDoc, position, parsedHTML);
    }
}

export function getEmbeddedCompletion(document: TextDocument, position: Position): CompletionList | null {
    const context = getContextAtPosition(document, position);
    
    if (context.type === 'css' && context.virtualDoc) {
        const stylesheet = cssLanguageService.parseStylesheet(context.virtualDoc);
        return cssLanguageService.doComplete(context.virtualDoc, position, stylesheet);
        
    } else if (context.type === 'javascript' && context.virtualDoc) {
        return getJSCompletions(context.virtualDoc, position);
        
    } else {
        const htmlDoc = getVirtualHTMLDocument(document);
        const parsedHTML = htmlLanguageService.parseHTMLDocument(htmlDoc);
        return htmlLanguageService.doComplete(htmlDoc, position, parsedHTML);
    }
}

export function getEmbeddedDiagnostics(document: TextDocument): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    const text = document.getText();
    try {
        const cssRegex = /<(style|css)([^>]*)>([\s\S]*?)<\/\1>/gi;
        let match;
        while ((match = cssRegex.exec(text)) !== null) {
            const start = match.index + match[0].indexOf('>') + 1;
            const end = start + match[3].length;
            let mask = text.replace(/[^\r\n]/g, ' ');
            mask = mask.substring(0, start) + match[3] + mask.substring(end);
            const cssVirtualDoc = TextDocument.create(document.uri, 'css', document.version, mask);
            
            const stylesheet = cssLanguageService.parseStylesheet(cssVirtualDoc);
            const cssDiag = cssLanguageService.doValidation(cssVirtualDoc, stylesheet);
            if (cssDiag) diagnostics = diagnostics.concat(cssDiag);
        }
    } catch (err) {
        console.error("CSS Validation error:", err);
    }

    try {
        const jsRegex = /<(script|javascript)([^>]*)>([\s\S]*?)<\/\1>/gi;
        let match;
        while ((match = jsRegex.exec(text)) !== null) {
            const start = match.index + match[0].indexOf('>') + 1;
            const end = start + match[3].length;
            let mask = text.replace(/[^\r\n]/g, ' ');
            mask = mask.substring(0, start) + match[3] + mask.substring(end);
            const jsVirtualDoc = TextDocument.create(document.uri, 'javascript', document.version, mask);
            
            const jsDiag = getJSDiagnostics(jsVirtualDoc);
            if (jsDiag) diagnostics = diagnostics.concat(jsDiag);
        }
    } catch (err) {
        console.error("JS Validation error:", err);
    }

    return diagnostics;
}