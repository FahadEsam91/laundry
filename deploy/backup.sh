#!/usr/bin/env sh
# Daily PostgreSQL backup (keep 14 days). Cron example:  0 3 * * * /opt/nuqa/deploy/backup.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T db pg_dump -U nuqa -Fc nuqa > "backups/nuqa-$(date +%F).dump"
find backups -name 'nuqa-*.dump' -mtime +14 -delete
