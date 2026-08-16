import sharp from "sharp";
import { writeFileSync } from "node:fs";

const amount = process.argv[2] || "500";
const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520">
  <rect width="720" height="520" fill="#ffffff"/>
  <rect x="0" y="0" width="720" height="90" fill="#7b1fa2"/>
  <text x="40" y="58" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">InstaPay</text>
  <text x="40" y="150" font-family="Arial, sans-serif" font-size="26" fill="#111111">Transfer Successful</text>
  <text x="40" y="220" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#111111">Amount: ${amount} EGP</text>
  <text x="40" y="280" font-family="Arial, sans-serif" font-size="26" fill="#111111">Date: ${today}</text>
  <text x="40" y="340" font-family="Arial, sans-serif" font-size="26" fill="#111111">Ref: 998877665544</text>
  <text x="40" y="400" font-family="Arial, sans-serif" font-size="24" fill="#111111">To: 01027857707</text>
  <text x="40" y="460" font-family="Arial, sans-serif" font-size="22" fill="#444444">Status: Completed</text>
</svg>`;

const out = `test-receipts/qa_${amount}_today.png`;
const buf = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(out, buf);
console.log("wrote", out, "date=", today, "bytes=", buf.length);
