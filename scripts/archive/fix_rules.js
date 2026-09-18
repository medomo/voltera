const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const regex = /function isValidSystemSettings\(data\) \{[\s\S]*?\n    \}/;
const replacement = `function isValidSystemSettings(data) {
      return data.stationName is string
        && data.logoText is string
        && data.phone is string
        && data.address is string
        && data.currency is string
        && data.tariffs is map
        && data.tariffs.residential is number
        && data.tariffs.commercial is number
        && data.tariffs.industrial is number
        && data.fixedFee is number
        && data.taxPercent is number
        && data.serviceFee is number;
    }`;

content = content.replace(regex, replacement);
fs.writeFileSync('firestore.rules', content);
console.log('Fixed firestore rules locally');
