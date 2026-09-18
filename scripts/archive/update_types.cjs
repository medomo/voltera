const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `
export interface InventoryItem {
  id: string;
  name: string;
  category: 'cables' | 'meters' | 'breakers' | 'oil' | 'other';
  quantity: number;
  unit: string;
  minAlertLevel: number;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  user: string;
  notes?: string;
}
`;

fs.appendFileSync('src/types.ts', newTypes);
console.log('Types updated.');
