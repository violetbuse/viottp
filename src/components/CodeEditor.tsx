import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting, type LanguageSupport } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

export type CodeEditorLanguage = "json" | "xml" | "html" | "text";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  language?: CodeEditorLanguage;
}

// Chrome (background, cursor, gutters) matches the app's design tokens
// (index.css @theme): panel-2 for the editor surface — the same tone as
// Input/Select — panel for the gutter, violet for cursor/selection/accents.
const appTheme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "13px", backgroundColor: "#120f18", color: "#f1eef8" },
    ".cm-content": { fontFamily: "inherit", caretColor: "#a78bfa" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#a78bfa" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(139, 92, 246, 0.35) !important",
    },
    ".cm-activeLine": { backgroundColor: "rgba(139, 92, 246, 0.07)" },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(139, 92, 246, 0.12)",
      color: "#c4b5fd",
    },
    ".cm-gutters": {
      backgroundColor: "#09070d",
      color: "#524a63",
      border: "none",
      borderRight: "1px solid #211b2b",
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "rgba(139, 92, 246, 0.25)",
      outline: "none",
    },
    ".cm-placeholder": { color: "#524a63" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#1c1725",
      border: "1px solid #332a42",
      color: "#ada6bd",
    },
    ".cm-tooltip": {
      backgroundColor: "#1c1725",
      border: "1px solid #332a42",
      color: "#f1eef8",
    },
    "&.cm-focused": { outline: "none" },
  },
  { dark: true },
);

// Syntax palette tuned to the same violet/ink system instead of a generic
// off-the-shelf theme, so JSON/XML/HTML all read as part of the app rather
// than a pasted-in third-party widget. Tags are shared across JSON and
// markup grammars where lezer uses the same vocabulary (e.g. attributeValue
// reuses the JSON string color).
const appHighlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: "#c4b5fd" },
  { tag: [t.string, t.attributeValue], color: "#d9d3f0" },
  { tag: [t.number, t.bool], color: "#a78bfa" },
  { tag: t.null, color: "#746c85", fontStyle: "italic" },
  { tag: [t.punctuation, t.separator], color: "#8f88a0" },
  { tag: [t.bracket, t.squareBracket, t.brace, t.paren, t.angleBracket], color: "#ada6bd" },
  { tag: t.tagName, color: "#c4b5fd" },
  { tag: t.attributeName, color: "#a78bfa" },
  { tag: t.comment, color: "#524a63", fontStyle: "italic" },
  { tag: [t.documentMeta, t.processingInstruction], color: "#746c85" },
]);

const editorTheme = [appTheme, syntaxHighlighting(appHighlightStyle)];

function languageExtension(language: CodeEditorLanguage): LanguageSupport | Extension {
  switch (language) {
    case "xml":
      return xml();
    case "html":
      return html();
    case "text":
      return [];
    case "json":
    default:
      return json();
  }
}

export function CodeEditor({
  value,
  onChange,
  readOnly,
  placeholder,
  minHeight,
  language = "json",
}: CodeEditorProps) {
  return (
    <div
      className="h-full min-h-0 overflow-hidden rounded-md border border-line-2 focus-within:border-violet-500 transition-colors"
      style={{ minHeight }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        editable={!readOnly}
        readOnly={readOnly}
        placeholder={placeholder}
        theme={editorTheme}
        extensions={[languageExtension(language)]}
        basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: !readOnly }}
        height="100%"
        style={{ height: "100%" }}
      />
    </div>
  );
}
