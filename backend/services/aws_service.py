import boto3
import os
import logging
import socket
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger(__name__)

# Determine if we're in local development mode
IS_LOCAL = os.environ.get('IS_LOCAL', 'true').lower() == 'true'

# LocalStack endpoint (if using LocalStack)
LOCALSTACK_ENDPOINT = 'http://localhost:4566'  # Standard LocalStack port

# Check if LocalStack is running
def is_localstack_running():
    try:
        # Parse the endpoint URL to get host and port
        host = 'localhost'
        port = 4566
        
        # Create a socket connection to check if the service is running
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        sock.close()
        
        # If result is 0, the port is open and service is running
        return result == 0
    except Exception as e:
        logger.warning(f"Error checking LocalStack availability: {str(e)}")
        return False

logger.info(f"AWS Service initializing with IS_LOCAL={IS_LOCAL}")

# Flag to indicate if AWS services are available
aws_available = False

try:
    # Common arguments for boto3 clients
    common_args = {
        'region_name': 'us-east-1',
    }

    # If in local development mode, use LocalStack if it's running
    if IS_LOCAL:
        if is_localstack_running():
            logger.info(f"Using LocalStack at {LOCALSTACK_ENDPOINT}")
            common_args['endpoint_url'] = LOCALSTACK_ENDPOINT
            # For local development, we don't need real AWS credentials
            common_args['aws_access_key_id'] = 'test'
            common_args['aws_secret_access_key'] = 'test'
        else:
            logger.warning(f"LocalStack not running at {LOCALSTACK_ENDPOINT}. Using AWS directly.")
            # If LocalStack is not running, we'll try to use real AWS credentials
            # This will work if AWS credentials are configured in the environment

    # Configure AWS clients
    logger.info("Initializing AWS clients with args: " + str({k: v for k, v in common_args.items() if k != '4T3rwqc9K3ct21RyI4o44Sqw3ff6jLEXedLcaGUe'}))
    
    try:
        s3 = boto3.client('s3', **common_args)
        dynamodb = boto3.client('dynamodb', **common_args)
        dynamodb_resource = boto3.resource('dynamodb', **common_args)
        
        # Test connection by making a simple call
        s3.list_buckets()
        
        # Create table if it doesn't exist (for local development)
        if IS_LOCAL and 'endpoint_url' in common_args:
            try:
                # Check if table exists
                logger.info("Checking if DynamoDB table 'Podcasts' exists")
                dynamodb.describe_table(TableName='Podcasts')
                logger.info("DynamoDB table 'Podcasts' exists")
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceNotFoundException':
                    # Create the table
                    logger.info("Creating DynamoDB table 'Podcasts'")
                    dynamodb.create_table(
                        TableName='Podcasts',
                        KeySchema=[
                            {'AttributeName': 'PodcastId', 'KeyType': 'HASH'},
                            {'AttributeName': 'Type', 'KeyType': 'RANGE'}
                        ],
                        AttributeDefinitions=[
                            {'AttributeName': 'PodcastId', 'AttributeType': 'S'},
                            {'AttributeName': 'Type', 'AttributeType': 'S'}
                        ],
                        ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                    )
                    logger.info("DynamoDB table 'Podcasts' created successfully")
                else:
                    raise

        # Get the table
        table = dynamodb_resource.Table('Podcasts')
        
        # Set flag to indicate AWS services are available
        aws_available = True
        logger.info("AWS services initialized successfully")
    
    except Exception as e:
        logger.error(f"Error connecting to AWS services: {str(e)}")
        raise
    
except Exception as e:
    logger.error(f"Error initializing AWS services: {str(e)}")
    # Create dummy functions and objects for when AWS is not available
    s3 = None
    dynamodb = None
    dynamodb_resource = None
    table = None

def upload_file_to_s3(file_name, bucket, object_name=None):
    if not aws_available:
        logger.warning("AWS services not available. Skipping S3 upload.")
        return f"mock-s3://{bucket}/{object_name}"
        
    # Create bucket if it doesn't exist (for local development)
    if IS_LOCAL:
        try:
            s3.head_bucket(Bucket=bucket)
        except:
            s3.create_bucket(Bucket=bucket)
    
    s3.upload_fileobj(file_name, bucket, object_name)
    return f"s3://{bucket}/{object_name}"

def save_podcast_to_dynamodb(podcast_id, type, content, timestamp):
    if not aws_available:
        logger.warning(f"AWS services not available. Skipping DynamoDB save for {podcast_id}, {type}")
        return
        
    table.put_item(
        Item={
            'PodcastId': podcast_id,
            'Type': type,
            'Content': content,
            'Timestamp': str(timestamp)
        })