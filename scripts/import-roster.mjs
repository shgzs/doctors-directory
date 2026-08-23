import fs from "node:fs";

const input = process.argv[2] || "data/tums74.json";
const output = process.argv[3] || "data/roster.local.sql";
const rows = JSON.parse(fs.readFileSync(input, "utf8"));

const sql = (value) => value == null || value === "" ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const cleanName = (html = "") => {
  const match = String(html).match(/>([^<]*)<\/a>/i);
  return (match ? match[1] : html).replace(/<[^>]+>/g, "").trim();
};
const sourceRef = (html = "") => String(html).match(/[?&]sid=([^&\"]+)/i)?.[1] || null;

const statements = [
  "-- Generated locally from data/tums74.json. Do not publish this file.",
  "BEGIN TRANSACTION;",
];
let index = 0;
for (const row of rows) {
  if (!Array.isArray(row) || !row[2]) continue;
  index += 1;
  const name = cleanName(row[2]);
  const ref = sourceRef(row[2]);
  const id = `roster-${ref || index}`;
  statements.push(`INSERT OR IGNORE INTO class_roster (id, official_name, student_number, degree, field, graduation_year, source_status, source_ref) VALUES (${sql(id)}, ${sql(name)}, ${sql(row[1])}, ${sql(row[0])}, ${sql(row[3] || row[4])}, ${sql(row[5])}, ${sql(row[6])}, ${sql(ref)});`);
}
statements.push("COMMIT;", "");
fs.writeFileSync(output, statements.join("\n"), "utf8");
console.log(`Imported ${index} roster rows into ${output}`);
