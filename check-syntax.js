const fs = require('fs');
const babel = require('@babel/core');

try {
  const code = fs.readFileSync('D:/flareminds/AadviAtelier/AadviAtelierFrontend/client/app/order-details.js', 'utf8');
  babel.parse(code, {
    filename: 'order-details.js',
    presets: ['@babel/preset-react'],
    sourceType: 'module'
  });
  console.log('Syntax OK');
} catch (error) {
  console.error(error.message);
}
