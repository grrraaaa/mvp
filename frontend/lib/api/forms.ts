import type { FormFieldAction } from "@/store/assistantStore";
import { apiUrl } from "@/lib/api/baseUrl";

export interface OcrFillResponse {
  message: string;
  session_id: string;
  form_actions?: FormFieldAction[];
  form_fill_status?: string;
  suggested_chips?: string[];
  response_tone?: string;
  character_emotion?: string;
}

export async function ocrFillForm(
  imageBase64: string,
  formType: string,
  sessionId?: string | null,
): Promise<OcrFillResponse> {
  const res = await fetch(apiUrl("/api/forms/ocr-fill"), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageBase64,
      form_type: formType,
      session_id: sessionId ?? undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data as OcrFillResponse;
}

/** Read file as data URL (base64) for OCR API. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}
