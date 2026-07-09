import { Hover, Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService } from 'vscode-html-languageservice';

const htmlService = getLanguageService();
export function getHtmlHover(document: TextDocument, position: Position): Hover | null {
    const text = document.getText();
    const interfaceStartIndex = text.indexOf('<interface>');
    const interfaceEndIndex = text.indexOf('</interface>');
    const cursorOffset = document.offsetAt(position);

    if (interfaceStartIndex !== -1 && interfaceEndIndex !== -1) {
        if (cursorOffset > interfaceStartIndex && cursorOffset < interfaceEndIndex) {
            const htmlDocument = htmlService.parseHTMLDocument(document);
            return htmlService.doHover(document, position, htmlDocument);
        }
    }

    return null;
}