const fs = require("fs");
const path = require("path");

// Các màu cần thay
const replacements = [
  { from: /#0F52BA/gi, to: "#0064D3" }, // Blue → eBay Blue
  { from: /#0A3C8A/gi, to: "#E53238" }, // Dark Blue Hover → eBay Red
  { from: /0F52BA/gi, to: "0064D3" },   // Trường hợp không có dấu #
];

// Hàm duyệt thư mục
function replaceInDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      replaceInDir(fullPath); // duyệt tiếp
    } else if (/\.(js|jsx|ts|tsx|css|scss|html|json)$/i.test(file)) {
      let content = fs.readFileSync(fullPath, "utf8");
      let original = content;

      replacements.forEach(rep => {
        content = content.replace(rep.from, rep.to);
      });

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf8");
        console.log(`✔ Updated: ${fullPath}`);
      }
    }
  });
}

// Chạy script
replaceInDir(path.resolve(__dirname, "src")); // thay "src" = thư mục bạn muốn scan
console.log("🎨 Done! Đã đổi màu sang theme eBay.");
