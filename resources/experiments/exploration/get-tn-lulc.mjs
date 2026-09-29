import fs from "fs";

const text = fs.readFileSync("scratch/bhuvan-vec1-caps.xml", "utf-8");

const idx = text.indexOf("<Name>basemap:TN_LULC</Name>");
if (idx !== -1) {
  const start = text.lastIndexOf("<Layer", idx);
  const end = text.indexOf("</Layer>", idx) + 8;
  console.log(text.slice(start, end));
} else {
  console.log("Not found");
}
