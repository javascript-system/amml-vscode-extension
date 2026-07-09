# AMML Language Support for Visual Studio Code

> Official Visual Studio Code extension for **AMML (Advanced Modular Markup Language)**.

Bring a modern development experience to AMML with syntax highlighting, IntelliSense, formatting, diagnostics, hover documentation, and embedded JavaScript/CSS language support.

---

# ✨ Features

## 🎨 Syntax Highlighting

AMML files are highlighted using your current VS Code theme, providing a clean and familiar editing experience.

Features include:

- Special tag highlighting
- Metadata highlighting
- XML-based syntax
- Embedded language detection
- Theme-aware colors (Light, Dark, High Contrast, etc.)

---

## 🚀 Formatter

Format your entire document with a single shortcut.

```
Shift + Alt + F
```

The formatter understands AMML syntax while preserving embedded JavaScript and CSS.

Example:

Before

```xml
<!AMML"master">
<window title="My App"/>
<interface><div><h1>Hello</h1></div></interface>
```

After

```xml
<!AMML "master">

<window title="My App"/>

<interface>
    <div>
        <h1>Hello</h1>
    </div>
</interface>
```

---

## 🧠 IntelliSense

The extension provides intelligent language support inside embedded code blocks.

Supported languages:

- JavaScript
- CSS

That means you get:

- Autocomplete
- Hover information
- Documentation
- Error checking
- Warnings
- Code validation

directly inside:

```xml
<javascript>

</javascript>
```

and

```xml
<css>

</css>
```

without leaving your AMML file.

---

## 🔍 Live Diagnostics

Errors are detected while you type.

The extension reports:

- Unknown AMML syntax
- Invalid structures
- JavaScript errors
- CSS errors
- Embedded language diagnostics

Everything updates in real time.

---

## 💬 Plugin Hover Documentation

Hover any plugin name to instantly view its documentation.

Example:

```xml
<!element:src("menu.amml")/>
```

Hovering over **element** displays:

- Plugin name
- Description
- Version
- Author
- Supported features
- Required commands
- Internet requirements
- Usage example
- GitHub source

No need to open external documentation.

---

## ⚡ Embedded JavaScript & CSS

AMML isn't just syntax highlighted.

The extension fully recognizes embedded JavaScript and CSS.

Example:

```xml
<javascript>
const button = document.getElementById("btn");

button.addEventListener("click", () => {

});
</javascript>
```

The editor behaves exactly as if you were editing a normal JavaScript file.

The same applies to CSS.

---

## 🌐 Live Language Server

The extension includes its own Language Server, providing modern editor features such as:

- Live diagnostics
- Hover information
- Plugin documentation
- IntelliSense
- Embedded language support
- Formatting

Everything runs while you edit your project.

---

# 📦 Current Features

- ✅ Syntax Highlighting
- ✅ Theme-aware colors
- ✅ Formatter
- ✅ Embedded JavaScript support
- ✅ Embedded CSS support
- ✅ JavaScript diagnostics
- ✅ CSS diagnostics
- ✅ Hover documentation
- ✅ Official plugin information
- ✅ Language Server
- ✅ IntelliSense

---

# 🚧 Planned Features

The extension is under active development.

Upcoming features include:

- Auto-completion for AMML plugins
- Auto-completion for plugin options
- File path suggestions
- Go to Definition
- Rename Symbol
- Code Actions
- Quick Fixes
- Project Explorer support
- Better diagnostics
- More intelligent formatting

---

# 📖 About AMML

AMML (Advanced Modular Markup Language) is a markup language designed to organize large web projects through reusable components and a powerful plugin system.

Instead of replacing HTML, AMML compiles into standard HTML, XML, or JSON, making the final output compatible with browsers, Electron, servers, and other web technologies.

Learn more in the main AMML repository.

---

# ❤️ Feedback

Found a bug?

Have an idea?

Want to contribute?

Issues and pull requests are always welcome.

If you enjoy the project, consider giving it a ⭐ on GitHub. It helps the project grow and supports future development.

Happy coding with AMML!
