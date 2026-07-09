Init Commands

```
aws sso login
aws codeartifact login --tool npm --domain <domain> --domain-owner <domain-owner> --repository <repo-name>

mkdir excel-grid-view ;
cd excel-grid-view ;
npm init -y ;
npm install --save-dev typescript @types/node ;
npx tsc --init ;
mkdir src ;
```

`tsconfig.js`

```
{
  "compilerOptions": {
    "target": "ES6",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

```
rm -rf dist ;
npx tsc ; 
npx esbuild dist/Grid.js --bundle --outfile=dist/bundle.js ;

rmmdir dist ;
npx tsc ; 
npx esbuild dist/Grid.js --bundle --outfile=dist/bundle.js ;
```
