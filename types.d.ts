declare module 'is-self-closing' {
    function isSelfClosing(tagName: string): boolean;
    export = isSelfClosing;
}

interface PluginMetadata {
    name: string;
    version: string;
    author: string;
    description: string;
    example: string;
    supports: string[];
}