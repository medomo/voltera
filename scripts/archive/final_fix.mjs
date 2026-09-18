import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const closing = `        )}
      </div>
      )}
{typeof document !== 'undefined' && createPortal(<>`;

const fixedClosing = `        )}
      </div>
      </>
      )}
{typeof document !== 'undefined' && createPortal(<>`;

content = content.replace(closing, fixedClosing);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
