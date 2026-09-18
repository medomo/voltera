const fs = require('fs');
let code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

const str1 = `            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`;
// Put the grid opening tag back in where it should be
code = code.replace(
  `              </div>\n            </div>\n\n            {filteredInventory`,
  `              </div>\n            </div>\n\n            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n            {filteredInventory`
);

fs.writeFileSync('src/components/AdminInventory.tsx', code);
