#!/bin/bash

# =========================================================================
# OpenSearch Connection Test Script
# =========================================================================
#
# This script provides a convenient way to test connectivity to AWS OpenSearch
# by setting the necessary environment variables and running the Python test script.
#
# Purpose:
# - Quickly verify OpenSearch connectivity with proper authentication
# - Test if the master user credentials are working correctly
# - Troubleshoot connection issues independently from the main application
#
# Usage:
#   ./tests/opensearch/run_opensearch_test.sh
#
# This script sets up the following environment variables:
# - OPENSEARCH_DOMAIN_ENDPOINT: URL of the OpenSearch domain
# - OPENSEARCH_AUTH_METHOD: Authentication method (master_user)
# - OPENSEARCH_MASTER_USERNAME: Username for master user authentication
# - OPENSEARCH_MASTER_PASSWORD: Password for master user authentication
#
# Note: You may need to modify the credentials in this file to match your
# OpenSearch domain configuration.
# =========================================================================

# Use the project's virtual environment
source ./PN/bin/activate

# Set environment variables
export IS_LOCAL=false
export MOCK_MODE=false

# OpenSearch configuration
export OPENSEARCH_DOMAIN_ENDPOINT="https://***REMOVED***"
export OPENSEARCH_AUTH_METHOD="master_user"
export OPENSEARCH_MASTER_USERNAME="***REMOVED***"
export OPENSEARCH_MASTER_PASSWORD="***REMOVED***"

echo "Testing OpenSearch connection..."
python tests/opensearch/test_opensearch.py
