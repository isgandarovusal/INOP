FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS builder
WORKDIR /app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY package*.json tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN --mount=type=secret,id=npm-network --mount=type=secret,id=npm-ca \
    node -e 'const fs=require("fs"),{spawnSync}=require("child_process"); \
    const env={...process.env,...(fs.existsSync("/run/secrets/npm-network")?JSON.parse(fs.readFileSync("/run/secrets/npm-network","utf8")):{} )}; \
    if(fs.existsSync("/run/secrets/npm-ca"))env.NODE_EXTRA_CA_CERTS="/run/secrets/npm-ca"; \
    const result=spawnSync("npm",["ci"],{stdio:"inherit",env}); \
    fs.rmSync("/root/.npm",{recursive:true,force:true}); \
    if(result.status!==0)process.exit(result.status||1); \
    const pkg=require("./package.json");for(const name of Object.keys({...pkg.dependencies,...pkg.devDependencies}))if(!fs.existsSync("node_modules/"+name+"/package.json"))throw Error("Dependency installation incomplete");'
RUN npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
