FROM nginx:1.27-alpine

# Remove the default config shipped with nginx.
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf     /etc/nginx/nginx.conf
COPY proxy_params   /etc/nginx/proxy_params

# Create directories for SSL certs and ACME challenges.
RUN mkdir -p /etc/nginx/ssl /var/www/certbot

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO /dev/null http://localhost/api/v1/health || exit 1
