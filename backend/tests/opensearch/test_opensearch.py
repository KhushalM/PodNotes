"""
OpenSearch Connection Test Utility

This script provides a standalone test for verifying connectivity to AWS OpenSearch.
It's useful for troubleshooting authentication and connection issues independently 
from the main application.

Purpose:
- Verify OpenSearch domain connectivity
- Test authentication methods (master user or IAM)
- Check cluster health and status

Usage:
- Run directly: python tests/opensearch/test_opensearch.py
- Or use the companion script: ./tests/opensearch/run_opensearch_test.sh

Environment Variables:
- OPENSEARCH_DOMAIN_ENDPOINT: URL of the OpenSearch domain
- OPENSEARCH_AUTH_METHOD: Authentication method (master_user or iam)
- OPENSEARCH_MASTER_USERNAME: Username for master user authentication
- OPENSEARCH_MASTER_PASSWORD: Password for master user authentication

This test is valuable when:
- Setting up a new OpenSearch domain
- Troubleshooting authentication issues
- Verifying AWS IAM permissions
"""

import os
import sys
import logging
import requests
from requests.auth import HTTPBasicAuth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Test OpenSearch connection and setup"""
    # Get configuration from environment variables
    domain_endpoint = os.environ.get('OPENSEARCH_DOMAIN_ENDPOINT', '')
    auth_method = os.environ.get('OPENSEARCH_AUTH_METHOD', '')
    username = os.environ.get('OPENSEARCH_MASTER_USERNAME', '')
    password = os.environ.get('OPENSEARCH_MASTER_PASSWORD', '')
    
    # Log configuration
    logger.info("OpenSearch Configuration:")
    logger.info(f"Endpoint: {domain_endpoint}")
    logger.info(f"Auth Method: {auth_method}")
    logger.info(f"Username: {username}")
    
    # Validate configuration
    if not domain_endpoint:
        logger.error("OPENSEARCH_DOMAIN_ENDPOINT environment variable not set")
        return 1
    
    if auth_method == 'master_user' and (not username or not password):
        logger.error("Master user credentials not provided")
        return 1
    
    # Set headers
    headers = {
        "Content-Type": "application/json",
        "Accept": "*/*"
    }
    
    # Test connection
    logger.info("Testing OpenSearch connection...")
    
    try:
        # Create authentication
        auth = HTTPBasicAuth(username, password)
        
        # Make request
        response = requests.get(
            f"{domain_endpoint}/_cluster/health",
            auth=auth,
            headers=headers,
            verify=True,
            timeout=10
        )
        
        # Check response
        if response.status_code >= 200 and response.status_code < 300:
            logger.info(f"Successfully connected to OpenSearch. Cluster status: {response.json().get('status')}")
            return 0
        else:
            logger.error(f"Failed to connect to OpenSearch: {response.status_code}")
            logger.error(response.text)
            return 1
    except Exception as e:
        logger.error(f"Error connecting to OpenSearch: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
