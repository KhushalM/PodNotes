from math import log
import boto3
import os
import logging
import socket
import json
from botocore.exceptions import ClientError
from langchain_community.vectorstores import Chroma
from services.chromadb_service import get_embeddings
from pathlib import Path
from datetime import datetime
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)

# Determine if we're in local development mode
IS_LOCAL = os.environ.get('IS_LOCAL', 'false').lower() == 'true'
LOCAL_VECTOR_STORE_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vector_stores"))
os.makedirs(LOCAL_VECTOR_STORE_DIR, exist_ok=True)

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
        localstack_running = is_localstack_running()
        if localstack_running:
            logger.info(f"Using LocalStack at {LOCALSTACK_ENDPOINT}")
            common_args['endpoint_url'] = LOCALSTACK_ENDPOINT
            # For local development, we don't need real AWS credentials
            common_args['aws_access_key_id'] = 'test'
            common_args['aws_secret_access_key'] = 'test'
        else:
            logger.warning(f"LocalStack not running at {LOCALSTACK_ENDPOINT}. Using DynamoDB Local fallback.")
            # If LocalStack is not running, try to use DynamoDB Local
            common_args['endpoint_url'] = 'http://localhost:8000'  # DynamoDB Local default port
            common_args['aws_access_key_id'] = 'test'
            common_args['aws_secret_access_key'] = 'test'
            common_args['region_name'] = 'us-east-1'
    
    # Configure AWS clients
    logger.info("Initializing AWS clients with args: " + str({k: v for k, v in common_args.items() if k != '4T3rwqc9K3ct21RyI4o44Sqw3ff6jLEXedLcaGUe'}))
    
    try:
        s3 = boto3.client('s3', **common_args)
        dynamodb = boto3.client('dynamodb', **common_args)
        dynamodb_resource = boto3.resource('dynamodb', **common_args)
        
        # Initialize OpenSearch client
        opensearch_client = boto3.client('opensearch', **common_args)
        
        # Test connection by making a simple call
        s3.list_buckets()
        
        # Create table if it doesn't exist (for local development)
        if IS_LOCAL:
            try:
                # Check if table exists
                logger.info("Checking if DynamoDB table 'Podcasts' exists")
                dynamodb.describe_table(TableName='Podcasts')
                logger.info("DynamoDB table 'Podcasts' exists")
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceNotFoundException':
                    # Create the table
                    logger.info("Creating DynamoDB table 'Podcasts'")
                    try:
                        dynamodb.create_table(
                            TableName='Podcasts',
                            KeySchema=[
                                {'AttributeName': 'PodcastID', 'KeyType': 'HASH'},
                                {'AttributeName': 'Type', 'KeyType': 'RANGE'}
                            ],
                            AttributeDefinitions=[
                                {'AttributeName': 'PodcastID', 'AttributeType': 'S'},
                                {'AttributeName': 'Type', 'AttributeType': 'S'}
                            ],
                            ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                        )
                        logger.info("DynamoDB table 'Podcasts' created successfully")
                        
                        # Wait for the table to be active
                        logger.info("Waiting for table to become active...")
                        waiter = dynamodb.get_waiter('table_exists')
                        waiter.wait(TableName='Podcasts')
                        logger.info("Table is now active")
                    except Exception as create_error:
                        logger.error(f"Error creating table: {str(create_error)}")
                        raise
                else:
                    logger.error(f"Error checking table existence: {str(e)}")
                    raise
        
        # Get the table
        table = dynamodb_resource.Table('Podcasts')
        logger.info("DynamoDB table 'Podcasts' all information: " + str(table))
        
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
    opensearch_client = None

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

def save_podcast_to_dynamodb(podcast_id, content_type, content, timestamp=None):
    """
    Save podcast data to DynamoDB
    Args:
        podcast_id (str): The podcast ID
        content_type (str): The type of content (transcript, summary, etc.)
        content (str or dict): The content to save
        timestamp (str, optional): Timestamp for the entry
    """
    try:
        # Use current timestamp if not provided
        if timestamp is None:
            timestamp = datetime.now().isoformat()
        
        # Handle None content
        if content is None:
            content = ""  # Use empty string instead of None
        
        # Convert content to DynamoDB format based on its type
        if isinstance(content, list):
            # If content is a list of dictionaries (like our new transcript format)
            dynamodb_content = {'L': []}
            for item in content:
                if isinstance(item, dict):
                    # Convert each dictionary to DynamoDB map format
                    map_item = {'M': {}}
                    for key, value in item.items():
                        # Convert each value based on its type
                        if isinstance(value, str):
                            map_item['M'][key] = {'S': value}
                        elif isinstance(value, (int, float)):
                            map_item['M'][key] = {'N': str(value)}
                        elif isinstance(value, bool):
                            map_item['M'][key] = {'BOOL': value}
                        elif value is None:
                            map_item['M'][key] = {'NULL': True}
                        else:
                            # Convert other types to string
                            map_item['M'][key] = {'S': str(value)}
                    dynamodb_content['L'].append(map_item)
                elif isinstance(item, str):
                    dynamodb_content['L'].append({'S': item})
                elif isinstance(item, (int, float)):
                    dynamodb_content['L'].append({'N': str(item)})
                elif isinstance(item, bool):
                    dynamodb_content['L'].append({'BOOL': item})
                else:
                    # Convert other types to string
                    dynamodb_content['L'].append({'S': str(item)})
        elif isinstance(content, dict):
            # Convert dictionary to DynamoDB map format
            dynamodb_content = {'M': {}}
            for key, value in content.items():
                if isinstance(value, str):
                    dynamodb_content['M'][key] = {'S': value}
                elif isinstance(value, (int, float)):
                    dynamodb_content['M'][key] = {'N': str(value)}
                elif isinstance(value, bool):
                    dynamodb_content['M'][key] = {'BOOL': value}
                elif value is None:
                    dynamodb_content['M'][key] = {'NULL': True}
                else:
                    # Convert other types to string
                    dynamodb_content['M'][key] = {'S': str(value)}
        elif isinstance(content, str):
            dynamodb_content = {'S': content}
        elif isinstance(content, (int, float)):
            dynamodb_content = {'N': str(content)}
        elif isinstance(content, bool):
            dynamodb_content = {'BOOL': content}
        else:
            # Convert other types to string
            dynamodb_content = {'S': str(content)}
        
        logger.info(f"Content before saving (type: {type(content).__name__})")
        
        # Get DynamoDB client and resource
        dynamodb = boto3.client('dynamodb', **common_args)
        dynamodb_resource = boto3.resource('dynamodb', **common_args)
        
        # Check if we're running locally
        if IS_LOCAL:
            # Check if table exists, create if not
            try:
                dynamodb.describe_table(TableName='Podcasts')
                logger.info("DynamoDB table 'Podcasts' exists")
            except Exception as e:
                if "ResourceNotFoundException" in str(e):
                    logger.info("DynamoDB table 'Podcasts' does not exist, creating...")
                    dynamodb.create_table(
                        TableName='Podcasts',
                        KeySchema=[
                            {'AttributeName': 'PodcastID', 'KeyType': 'HASH'},
                            {'AttributeName': 'Type', 'KeyType': 'RANGE'}
                        ],
                        AttributeDefinitions=[
                            {'AttributeName': 'PodcastID', 'AttributeType': 'S'},
                            {'AttributeName': 'Type', 'AttributeType': 'S'}
                        ],
                        ProvisionedThroughput={'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                    )
                    logger.info("DynamoDB table 'Podcasts' created successfully")
                else:
                    logger.error(f"Error checking DynamoDB table: {str(e)}")
            
            # When running locally, use the client interface which works better with local DynamoDB
            logger.info("Using DynamoDB client interface (local mode)")
            client_item = {
                'PodcastID': {'S': podcast_id},
                'Type': {'S': content_type},
                'Content': dynamodb_content,
                'Timestamp': {'S': str(timestamp)}
            }
            
            # Log the item structure (without the full content for brevity)
            log_item = client_item.copy()
            if 'Content' in log_item:
                log_item['Content'] = f"[Content of type {type(content).__name__}]"
            logger.info(f"Saving item to DynamoDB using client: {log_item}")
            
            # Save to DynamoDB using the client directly
            dynamodb.put_item(
                TableName='Podcasts',
                Item=client_item
            )
            logger.info(f"Successfully saved {content_type} data for podcast {podcast_id} to DynamoDB using client")
        else:
            # When running in AWS, use the resource interface
            logger.info("Using DynamoDB resource interface (AWS mode)")
            table = dynamodb_resource.Table('Podcasts')
            
            # For resource interface, we need to convert from DynamoDB format back to Python native types
            if isinstance(content, list):
                resource_content = content
            elif isinstance(content, dict):
                resource_content = content
            else:
                resource_content = content
                
            resource_item = {
                'PodcastID': podcast_id,
                'Type': content_type,
                'Content': resource_content,
                'Timestamp': str(timestamp)
            }
            
            # Log the item structure (without the full content for brevity)
            log_item = resource_item.copy()
            if 'Content' in log_item:
                log_item['Content'] = f"[Content of type {type(content).__name__}]"
            logger.info(f"Saving item to DynamoDB using resource: {log_item}")
            
            # Save to DynamoDB using resource
            table.put_item(Item=resource_item)
            logger.info(f"Successfully saved {content_type} data for podcast {podcast_id} to DynamoDB using resource")
            
    except Exception as e:
        logger.error(f"Error saving to DynamoDB: {str(e)}")
        raise