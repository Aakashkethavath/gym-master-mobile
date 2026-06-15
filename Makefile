# ─────────────────────────────────────────────────────────────────────────────
# Makefile — Gym Master project shortcuts
#
# Usage: make <target>
# Run `make help` to list all targets.
# ─────────────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help
.PHONY: help dev prod down seed logs shell lint build clean secrets ssl

# ── Colours ───────────────────────────────────────────────────────────────────
BOLD  = \033[1m
GREEN = \033[32m
CYAN  = \033[36m
RESET = \033[0m

help: ## Show this help message
	@echo ""
	@echo "$(BOLD)Gym Master — available commands$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ── Development ───────────────────────────────────────────────────────────────

dev: ## Start development stack (MongoDB + API with hot-reload)
	@echo "$(GREEN)Starting development stack...$(RESET)"
	docker compose up -d --build
	@echo "$(GREEN)API ready at http://localhost:5000$(RESET)"

down: ## Stop and remove all containers (keeps volumes)
	docker compose down
	docker compose -f docker-compose.prod.yml down 2>/dev/null || true

down-all: ## Stop containers AND delete all volumes (wipes database)
	docker compose down -v
	docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true

logs: ## Follow API logs (dev)
	docker compose logs -f api

logs-all: ## Follow all service logs (dev)
	docker compose logs -f

shell: ## Open a shell inside the API container (dev)
	docker compose exec api sh

# ── Seeding ───────────────────────────────────────────────────────────────────

seed: ## Seed the database with demo admin, client, plans and trainers
	docker compose exec api node src/scripts/seed.js

seed-prod: ## Seed the production database
	docker compose -f docker-compose.prod.yml exec api node src/scripts/seed.js

# ── Production ────────────────────────────────────────────────────────────────

secrets: ## Generate Docker secret files (run once before first prod deploy)
	@chmod +x secrets/generate.sh
	./secrets/generate.sh

ssl-self-signed: ## Generate a self-signed TLS cert for local HTTPS testing
	@mkdir -p nginx/ssl
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout nginx/ssl/privkey.pem \
		-out nginx/ssl/fullchain.pem \
		-subj "/CN=localhost/O=GymMaster/C=IN"
	@echo "$(GREEN)Self-signed cert written to nginx/ssl/$(RESET)"
	@echo "$(CYAN)For production, replace with a Let's Encrypt certificate.$(RESET)"

ssl-certbot: ## Issue/renew a Let's Encrypt cert via Certbot (provide DOMAIN=yourhost.com)
	@test -n "$(DOMAIN)" || (echo "Usage: make ssl-certbot DOMAIN=api.gymmaster.app" && exit 1)
	certbot certonly --webroot \
		-w /var/www/certbot \
		-d $(DOMAIN) \
		--email admin@$(DOMAIN) \
		--agree-tos \
		--non-interactive
	cp /etc/letsencrypt/live/$(DOMAIN)/fullchain.pem nginx/ssl/fullchain.pem
	cp /etc/letsencrypt/live/$(DOMAIN)/privkey.pem   nginx/ssl/privkey.pem
	docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

prod: ## Start production stack (requires secrets + SSL cert)
	@echo "$(GREEN)Checking prerequisites...$(RESET)"
	@test -f secrets/jwt_access_secret.txt  || (echo "Run: make secrets" && exit 1)
	@test -f nginx/ssl/fullchain.pem        || (echo "Run: make ssl-self-signed (or ssl-certbot)" && exit 1)
	@echo "$(GREEN)Starting production stack...$(RESET)"
	docker compose -f docker-compose.prod.yml up -d --build
	@echo "$(GREEN)Production stack running.$(RESET)"

prod-logs: ## Follow production API logs
	docker compose -f docker-compose.prod.yml logs -f api

prod-shell: ## Shell into production API container
	docker compose -f docker-compose.prod.yml exec api sh

prod-restart: ## Rolling-restart the API service (zero-downtime)
	docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Build all Docker images without starting containers
	docker compose build
	docker compose -f docker-compose.prod.yml build

build-no-cache: ## Rebuild all images from scratch (no layer cache)
	docker compose build --no-cache
	docker compose -f docker-compose.prod.yml build --no-cache

# ── Code quality ──────────────────────────────────────────────────────────────

lint-server: ## Lint the server source
	cd server && npm run lint

lint-mobile: ## Lint the mobile source
	cd mobile && npm run lint

typecheck: ## TypeScript typecheck on mobile
	cd mobile && npm run typecheck

lint: lint-server lint-mobile ## Lint everything

# ── Security ──────────────────────────────────────────────────────────────────

audit: ## Run npm security audit on both packages
	@echo "$(CYAN)Server audit:$(RESET)"
	cd server && npm audit --audit-level=high
	@echo "$(CYAN)Mobile audit:$(RESET)"
	cd mobile && npm audit --audit-level=high

rotate-secret: ## Rotate a single secret: make rotate-secret NAME=jwt_access_secret
	@test -n "$(NAME)" || (echo "Usage: make rotate-secret NAME=<secret_name>" && exit 1)
	@chmod +x secrets/rotate.sh
	./secrets/rotate.sh $(NAME)

scan-image: ## Scan the API image for vulnerabilities (requires trivy)
	trivy image gymmaster-api:latest

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove stopped containers, dangling images, unused networks
	docker system prune -f
	docker volume ls -qf dangling=true | xargs -r docker volume rm

clean-all: clean ## Remove everything including named volumes (DESTRUCTIVE)
	docker compose down -v
	docker compose -f docker-compose.prod.yml down -v
