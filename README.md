# AMML (Advanced Modular Markup Language)

> Build organized, modular, and extensible web applications with a powerful plugin-based markup language.

AMML (Advanced Modular Markup Language) is an open-source markup language designed to improve the organization of HTML projects without replacing the web itself. Instead of writing a single large HTML file, AMML lets you split your application into reusable components, modules, and plugins, compiling everything into a standard HTML, XML, or JSON output.

The final result is plain web code that can run anywhere: browsers, Electron, servers, or any environment capable of reading HTML.

---

## Why AMML?

Writing large HTML projects usually becomes difficult over time.

AMML solves this by introducing:

- 📦 Modular project structure
- 🔌 Extensible plugin system
- ⚡ Fast compilation
- 🧩 Reusable components
- 🛠 Simple CLI
- 🌐 HTML / XML / JSON output
- 📄 Standard HTML generation
- 🔍 Debug compilation mode
- 💾 URL cache system
- 🧪 Plugin development tools

---

# Installation

Clone the repository and install the dependencies:

```bash
npm install
```

Make it global (if you don't want, you can still use node index.js)
```bash
npm link
```

You can then use the CLI:

```bash
amml help
```

---

# Language Overview

AMML keeps an XML-based syntax to simplify parsing while remaining easy to read.

Example:

```xml
<!AMML "master">

<window
    title="My Website"
    charset="utf-8"
    lang="en-US"/>

<interface>

    <!element:src("menu.amml")/>

    <!module:src("scripts.amml")/>

</interface>
```

Which compiles into a regular HTML document.

---

# Project Types

AMML currently supports three project types.

## Master

The application's main file.

Responsible for:

- Creating the HTML document
- Configuring the page
- Loading components
- Loading modules

Uses:

- `<window/>`
- `<interface>`

---

## Component

A reusable HTML fragment.

Components only define an `<interface>` block and are intended to be inserted inside master files.

---

## Module

Defines JavaScript and CSS resources.

Modules support:

- `<javascript>`
- `<css>`
- `<file src="">`
- `<file href="">`

which automatically generate standard HTML tags such as `<script>`, `<style>` and `<link>`.

---

# Special Tags

Plugins are executed through special tags.

General syntax:

```xml
<!plugin:option("value")/>
```

Examples:

```xml
<!element:src("menu.amml")/>

<!repeat:5("<br/>")/>

<!value:text("Hello!")/>
```

Every plugin decides whether options and values are required.

---

# Built-in Plugins

AMML v1.0 ships with **11 official plugins**, covering the most common tasks when building applications.

Current plugin categories include:

- Component insertion
- Module loading
- Value insertion
- Text repetition
- File loading
- URL loading
- Local cache support
- Debug utilities
- Resource management
- HTML generation
- Compilation helpers

Every plugin contains metadata such as:

- Author
- Version
- Description
- Dependencies
- Example
- Supported features

which can be inspected directly from the CLI.

---

# CLI Commands

## Compilation

Compile an AMML file:

```bash
amml compile project.amml --out index.html
```

Display the generated output without saving:

```bash
amml result project.amml
```

Run an AMML application:

```bash
amml run ./project
```

---

## Cache

Clear cache:

```bash
amml cache clear
```

Add cache entry:

```bash
amml cache add
```

List cached entries:

```bash
amml cache list
```

---

## Plugins

Install plugin:

```bash
amml plugins install
```

Add local plugin:

```bash
amml plugins add myPlugin.js
```

Remove plugin:

```bash
amml plugins remove Element
```

List plugins:

```bash
amml plugins list
```

Plugin information:

```bash
amml plugins info Element
```

Plugin diagnostics:

```bash
amml plugins doctor Element
```

Restore official plugins:

```bash
amml plugins reset
```

---

# Creating Plugins

Creating plugins is intentionally simple.

Create a JavaScript file beginning with:

```js
/**@plugin myPlugin*/
```

Export an object:

```js
module.exports = {
    name: "My Plugin",
    version: "1.0.0",
    author: "Your Name",
    description: "Plugin description",
    example: '<!myPlugin("Hello")/>',
    supports: [
        "files",
        "cache"
    ],
    returnsContent: true,
    dependencies: {
        requiresInternet: false,
        commands: []
    },
    async func(context) { return "Generated text" }
};
```

The plugin receives a complete Context API containing:

- Tag information
- Compiler settings
- Current script path
- Debug logger
- Standard logger
- Error helper

Once created, simply install it:

```bash
amml plugins add myPlugin.js
```

or publish it anywhere online:

```bash
amml plugins install
```

---

# Roadmap

The first public version is now complete.

The next planned features include:

- ✅ More official plugins
- ✅ Better special tags
- ✅ Native Visual Studio Code extension (.vsix)
- ✅ Full Language Server (autocomplete, diagnostics, hover, go-to-definition...)
- 🚧 Better IntelliSense
- 🚧 More built-in language features
- 🚧 Web compilation service running on Render
- 🚧 Community plugin ecosystem

---

# License

This project is licensed under the **ISC License**.

See the LICENSE file for more information.

---

# Contributing

Contributions are always welcome!

Whether you want to:

- Report bugs
- Suggest ideas
- Improve documentation
- Create plugins
- Improve performance
- Help with the VS Code extension

every contribution is appreciated.

If you enjoy this project, consider giving it a ⭐ on GitHub. It really helps the project grow and motivates future development.

Thank you for checking out AMML!
