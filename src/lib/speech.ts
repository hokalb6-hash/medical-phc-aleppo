"use client";

export function speakText(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

export function speakSuperAdminWelcome() {
  speakText("Welcome back, Eng. Mohammed Shaaban", "en-US");
}

export function speakExcelDownloadComplete() {
  speakText("تم التحميل أستاذ محمد", "ar-SA");
}

export function speakActionComplete() {
  speakText("تم تنفيذ المطلوب boss", "ar-SA");
}

export function speakClinicSaved() {
  speakText("تم اضافة العيادة بنجاح سيدي", "ar-SA");
}

export function speakDeleteWarning() {
  speakText("تحذير: أنت تقوم بعملية حذف، انتبه", "ar-SA");
}

export function speakCsvTemplateDownloadStart(managerName: string) {
  const name = managerName.trim() || "مدير المركز";
  speakText(`${name}، يتم الآن تحميل القالب`, "ar-SA");
}

export function speakCsvImportSuccess() {
  speakText("تم الاستيراد بنجاح، شكراً لك", "ar-SA");
}

export function speakSignOutGoodbye() {
  speakText("مع السلامة مهندس محمد", "ar-SA");
}

function filenameFromDisposition(header: string | null) {
  if (!header) return "download.xlsx";
  const quoted = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(header);
  const raw = quoted?.[1] ?? quoted?.[2] ?? quoted?.[3];
  if (!raw) return "download.xlsx";
  try {
    return decodeURIComponent(raw.trim().replace(/^"|"$/g, ""));
  } catch {
    return raw.trim().replace(/^"|"$/g, "") || "download.xlsx";
  }
}

export async function downloadFileWithSpeech(href: string) {
  const response = await fetch(href, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get("content-disposition"));
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);

  speakExcelDownloadComplete();
}

export async function downloadCsvTemplateWithSpeech(href: string, managerName: string) {
  speakCsvTemplateDownloadStart(managerName);

  const response = await fetch(href, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get("content-disposition"));
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
