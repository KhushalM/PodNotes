# PodNotes Test Directory

This directory contains test scripts and utilities for verifying various components of the PodNotes application.

## OpenSearch Tests

The `opensearch` directory contains utilities for testing connectivity to AWS OpenSearch:

### Files:
- `test_opensearch.py`: Python script to test OpenSearch connectivity and authentication
- `run_opensearch_test.sh`: Shell script that sets environment variables and runs the test

### Usage:

To test OpenSearch connectivity:

```bash
# From the backend directory
./tests/opensearch/run_opensearch_test.sh
```

This will verify that:
1. Your OpenSearch domain is reachable
2. Authentication is working properly
3. The cluster is in a healthy state

### When to Use:

These tests are useful when:
- Setting up a new OpenSearch domain
- Troubleshooting authentication issues
- Verifying AWS IAM permissions
- Testing after updating security settings

## Adding New Tests

When adding new tests to this directory, please follow these guidelines:

1. Create a subdirectory for the component being tested
2. Include clear documentation at the top of each test file
3. Make tests self-contained when possible
4. Update this README with information about new test categories
