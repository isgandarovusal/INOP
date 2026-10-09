FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm-network --mount=type=secret,id=npm-ca \
    node -e 'const fs=require("fs"),{spawnSync}=require("child_process"); \
    const env={...process.env,...(fs.existsSync("/run/secrets/npm-network")?JSON.parse(fs.readFileSync("/run/secrets/npm-network","utf8")):{} )}; \
    if(fs.existsSync("/run/secrets/npm-ca"))env.NODE_EXTRA_CA_CERTS="/run/secrets/npm-ca"; \
    const result=spawnSync("npm",["ci"],{stdio:"inherit",env}); \
    fs.rmSync("/root/.npm",{recursive:true,force:true}); \
    if(result.status!==0)process.exit(result.status||1); \
    const pkg=require("./package.json");for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies}))if(!fs.existsSync("node_modules/"+name+"/package.json"))throw Error("Dependency installation incomplete");'
# Copy runtime code only; seeds, tests, local files and uploads are not image data.
COPY server.js swagger.js ./
COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
RUN mkdir -p uploads
EXPOSE 3001
CMD ["node", "server.js"]
