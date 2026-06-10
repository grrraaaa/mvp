import Link from "next/link";
import { assistantLinkHref, normalizeAssistantLinks } from "@/lib/sbbol/sbbolLinks";

type Token =
  | { type: "text"; content: string }
  | { type: "link"; label: string; href: string };

const TOKEN_RE =
  /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<)\]]+)|(?<![\w.])(\/[\w\-/]+)/g;

const GOV_URL_FIXES: [RegExp, string][] = [
  [/https?:\/+\.?nalog\.gov\.by[^\s)\]]*/gi, "https://www.nalog.gov.by/"],
  [/https?:\/+\.?minfin\.gov\.by[^\s)\]]*/gi, "https://www.minfin.gov.by/"],
  [/https?:\/+\.?ssf\.gov\.by[^\s)\]]*/gi, "https://www.ssf.gov.by/"],
  [/https?:\/+\.?bgs\.by[^\s)\]]*/gi, "https://www.bgs.by/"],
  [/https?:\/+\.?by[^\s)\]]*/gi, "https://pravo.by/"],
];

function normalizeBrokenGovUrls(text: string): string {
  let out = text;
  for (const [pattern, replacement] of GOV_URL_FIXES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Чистим markdown-маркеры в plain-text ответах ассистента: убираем двойные
 * звёздочки (`**жирный**` → `жирный`), одиночные (`*курсив*` → `курсив`) и
 * подчёркивания (`__жирный__`). Никаких эмодзи-смайликов в ответах —
 * интерфейс строгий, иконки рисуются компонентами, не символами.
 */
function stripMarkdownMarkers(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2")
    .replace(/(^|[\s(])_([^_\n]+)_/g, "$1$2");
}

export function tokenizeAssistantMessage(text: string): Token[] {
  const normalized = stripMarkdownMarkers(
    normalizeBrokenGovUrls(normalizeAssistantLinks(text)),
  );
  const tokens: Token[] = [];
  let last = 0;

  for (const match of normalized.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ type: "text", content: normalized.slice(last, index) });
    }
    if (match[1] && match[2]) {
      tokens.push({ type: "link", label: match[1], href: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "link", label: match[3], href: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "link", label: match[4], href: match[4] });
    }
    last = index + match[0].length;
  }

  if (last < normalized.length) {
    tokens.push({ type: "text", content: normalized.slice(last) });
  }

  return tokens.length ? tokens : [{ type: "text", content: normalized }];
}

export function renderAssistantMessageContent(text: string) {
  return tokenizeAssistantMessage(text).map((token, i) => {
    if (token.type === "text") {
      return <span key={i}>{token.content}</span>;
    }

    const resolved = assistantLinkHref(token.href);
    const label = token.label || resolved.href;

    if (resolved.external) {
      return (
        <a
          key={i}
          href={resolved.href}
          target="_blank"
          rel="noopener noreferrer"
          className="sber-link break-all underline"
        >
          {label}
        </a>
      );
    }

    return (
      <Link key={i} href={resolved.href} className="sber-link break-all underline">
        {label}
      </Link>
    );
  });
}
