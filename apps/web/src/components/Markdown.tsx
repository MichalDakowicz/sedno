// Odpowiedzi AI jako Markdown z wzorami LaTeX (KaTeX). Surowy HTML z modelu nie jest renderowany.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import styles from "./Markdown.module.css";

// Modele piszą wzory także w \( \) i \[ \]; remark-math rozumie tylko $ i $$.
function normalizuj(tekst: string): string {
  return tekst.replace(/\\\[([\s\S]+?)\\\]/g, (_, w) => `\n$$${w}$$\n`).replace(/\\\(([\s\S]+?)\\\)/g, (_, w) => `$${w}$`);
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={[styles.md, className].filter(Boolean).join(" ")}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}>
        {normalizuj(children)}
      </ReactMarkdown>
    </div>
  );
}
