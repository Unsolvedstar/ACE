import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

interface CodeScriptEditorProps {
  source: string;
  onChange: (source: string, compiled: string) => void;
}

// The "typescript" package is only ever needed once a Code node's panel is actually open, so it's
// dynamic-imported here rather than pulled into the main bundle. The server never sees TypeScript
// syntax - only the compiled JS (see the "code" field this writes back via onChange) runs there,
// via Jint (CodeActionExecutor.cs).
let tsModulePromise: Promise<typeof import("typescript")> | null = null;
function getTs() {
  tsModulePromise ??= import("typescript");
  return tsModulePromise;
}

export function CodeScriptEditor({ source, onChange }: CodeScriptEditorProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    try {
      const ts = await getTs();
      const { outputText, diagnostics } = ts.transpileModule(value, {
        compilerOptions: { target: ts.ScriptTarget.ES2020 },
        reportDiagnostics: true,
      });
      const firstError = diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error);
      setError(firstError ? ts.flattenDiagnosticMessageText(firstError.messageText, " ") : null);
      onChange(value, outputText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compile script.");
      onChange(value, "");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <CodeMirror
        value={source}
        height="220px"
        theme="dark"
        basicSetup={{ lineNumbers: true, foldGutter: false }}
        extensions={[javascript({ typescript: true })]}
        onChange={handleChange}
        className="overflow-hidden rounded-lg border border-slate-200 text-xs"
      />
      {error && <p className="text-[10px] leading-relaxed text-red-400">{error}</p>}
    </div>
  );
}
