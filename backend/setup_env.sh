#!/bin/bash

# This script helps set up your .env file with the correct credentials
# It will NOT commit these credentials to Git

echo "Setting up your .env file with the correct credentials..."

# Create .env file with the credentials
cat > .env << EOL
# OpenSearch Configuration
OPENSEARCH_DOMAIN_ENDPOINT=https://***REMOVED***
OPENSEARCH_AUTH_METHOD=master_user
OPENSEARCH_MASTER_USERNAME=***REMOVED***
OPENSEARCH_MASTER_PASSWORD=***REMOVED***

# AWS Configuration (if using IAM authentication)
AWS_ACCESS_KEY_ID=***REMOVED***
AWS_SECRET_ACCESS_KEY=***REMOVED***
AWS_REGION=us-east-1

# Application Settings
IS_LOCAL=false
MOCK_MODE=false
EOL

echo ".env file created successfully!"
echo "IMPORTANT: This file is excluded from Git by .gitignore"
echo "You can now run your application with:"
echo "  ./start_backend_opensearch.sh"
