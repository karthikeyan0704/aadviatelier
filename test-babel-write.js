const fs = require('fs');
const babel = require('@babel/core');

try {
  const code = fs.readFileSync('D:/flareminds/AadviAtelier/AadviAtelierFrontend/client/app/create-order/details.js', 'utf8');
  babel.parse(code, {
    filename: 'details.js',
    presets: ['@babel/preset-react'],
    sourceType: 'module'
  });
  fs.writeFileSync('D:/flareminds/AadviAtelier/babel-test-output.txt', 'Syntax OK');
} catch (error) {
  fs.writeFileSync('D:/flareminds/AadviAtelier/babel-test-output.txt', error.stack || error.message);
}
