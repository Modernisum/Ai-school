#!/bin/bash
set -e

# Configuration
API_URL="http://127.0.0.1:8000"
SUPER_ADMIN_USER="superadmin"
SUPER_ADMIN_PASS="your_secure_password" # need to update this with actual creds

echo "1. Getting Admin Token..."
# Assuming there is a setup or default admin. Let's create one if needed, or query db for username.
