/** Canonical form for storage/display: preserve valid Persian spelling. */
export function normalizePersianText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\u064A/g, "ی") // Arabic yeh
    .replace(/\u0649/g, "ی") // alef maksura
    .replace(/\u0643/g, "ک") // Arabic kaf
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Search form: additionally treats hamza-yeh (ئ) as yeh, without changing display data. */
export function normalizePersianSearch(value: string | null | undefined): string {
  return normalizePersianText(value).replace(/ئ/g, "ی").toLocaleLowerCase();
}

/** SQLite expression matching the search form for columns containing legacy Arabic letters. */
export function persianSearchSql(column: string): string {
  return `REPLACE(REPLACE(REPLACE(REPLACE(${column}, 'ي', 'ی'), 'ى', 'ی'), 'ك', 'ک'), 'ئ', 'ی')`;
}

const PERSIAN_LATIN: Record<string, string> = {
  ا: "a", آ: "a", ب: "b", پ: "p", ت: "t", ث: "s", ج: "j", چ: "ch", ح: "h", خ: "kh",
  د: "d", ذ: "z", ر: "r", ز: "z", ژ: "zh", س: "s", ش: "sh", ص: "s", ض: "z", ط: "t",
  ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "gh", ک: "k", گ: "g", ل: "l", م: "m", ن: "n",
  و: "v", ه: "h", ی: "i", ئ: "i", ء: "", " ": "",
};

/** A deliberately forgiving key for English transliterations of Persian names. */
export function latinNameKey(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD").toLocaleLowerCase()
    .replace(/ph/g, "f").replace(/kh/g, "x").replace(/gh/g, "q")
    .replace(/[^a-z]/g, "").replace(/y/g, "i").replace(/[aeiou]/g, "");
}

export function persianToLatinKey(value: string | null | undefined): string {
  const text = normalizePersianSearch(value);
  return latinNameKey(Array.from(text).map(ch => PERSIAN_LATIN[ch] ?? ch).join(""));
}

export function rosterNameMatches(name: string, query: string): boolean {
  const faQuery = normalizePersianSearch(query);
  const faName = normalizePersianSearch(name);
  if (faQuery && faName.includes(faQuery)) return true;
  if (!/[a-z]/i.test(query)) return false;
  const latinQuery = latinNameKey(query);
  return latinQuery.length >= 2 && persianToLatinKey(name).includes(latinQuery);
}
