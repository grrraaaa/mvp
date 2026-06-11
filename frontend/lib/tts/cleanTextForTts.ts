/** Plain speech-friendly text from assistant markdown (mirror of backend services/tts/text.py). */
export function cleanTextForTts(text: string, maxLen = 2500): string {
  let t = text.trim();
  t = t.replace(/https?:\/\/\S+/g, "");
  t = t.replace(/[*_#>`]+/g, "");
  t = t.replace(/\n{2,}/g, ". ");
  t = t.replace(/\n/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();
  if (t.length > maxLen) {
    t = `${t.slice(0, maxLen - 1).trimEnd()}…`;
  }
  return t;
}
