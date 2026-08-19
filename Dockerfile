FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3456 \
    TESLA_COCKPIT_CONFIG_PATH=/data/config.json \
    TESLA_COCKPIT_ADDRESS_CACHE_PATH=/data/address-cache.json

COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public ./public

USER node

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3456/api/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
