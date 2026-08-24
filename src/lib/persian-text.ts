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
