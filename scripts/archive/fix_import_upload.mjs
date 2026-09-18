import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');
content = content.replace(
  /import React, \{ useState, useMemo \} from 'react';/,
  "import React, { useState, useMemo, useRef } from 'react';"
);

content = content.replace(
  /Send, Download\} from 'lucide-react';/,
  "Send, Download, Upload} from 'lucide-react';"
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

