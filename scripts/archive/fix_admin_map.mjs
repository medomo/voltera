import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const target1 = `        )}
      </div>
{typeof document !== 'undefined' && createPortal(<>`;

const newTarget1 = `        )}
      </div>
      )}
{typeof document !== 'undefined' && createPortal(<>`;

content = content.replace(target1, newTarget1);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
