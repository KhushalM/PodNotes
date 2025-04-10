#!/usr/bin/env python3
"""
ChromaDB Vector Store Viewer

This utility allows you to manually view and explore the contents of your ChromaDB vector stores.
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add the parent directory to the path so we can import from services
sys.path.append(str(Path(__file__).parent.parent))

from services.chromadb_service import view_vector_store, get_vector_store_stats

def main():
    parser = argparse.ArgumentParser(description='View and explore ChromaDB vector stores')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List all available vector stores')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Get statistics about vector stores')
    stats_parser.add_argument('--podcast-id', help='Podcast ID to get stats for (optional)')
    
    # View command
    view_parser = subparsers.add_parser('view', help='View documents in a vector store')
    view_parser.add_argument('podcast_id', help='Podcast ID to view')
    view_parser.add_argument('--limit', type=int, help='Maximum number of documents to return')
    view_parser.add_argument('--offset', type=int, default=0, help='Number of documents to skip')
    view_parser.add_argument('--include-embeddings', action='store_true', help='Include embeddings in the output')
    view_parser.add_argument('--speaker', help='Filter by speaker')
    view_parser.add_argument('--start-time', type=float, help='Filter by start time (in seconds)')
    view_parser.add_argument('--end-time', type=float, help='Filter by end time (in seconds)')
    view_parser.add_argument('--output', help='Output file path (optional)')
    view_parser.add_argument('--sort-by', choices=['time', 'relevance'], help='Sort results by time or relevance (default: relevance)')
    
    args = parser.parse_args()
    
    if args.command == 'list':
        # List all vector stores
        from services.chromadb_service import VECTOR_STORE_DIR
        
        print(f"Vector stores directory: {VECTOR_STORE_DIR}")
        print("\nAvailable vector stores:")
        
        for item in os.listdir(VECTOR_STORE_DIR):
            if item.endswith('.chroma') and os.path.isdir(VECTOR_STORE_DIR / item):
                podcast_id = item[:-7]  # Remove .chroma suffix
                print(f"- {podcast_id}")
    
    elif args.command == 'stats':
        # Get statistics
        if args.podcast_id:
            stats = get_vector_store_stats(args.podcast_id)
        else:
            stats = get_vector_store_stats()
        
        print(json.dumps(stats, indent=2))
    
    elif args.command == 'view':
        # Build filter metadata
        filter_metadata = {}
        if args.speaker:
            filter_metadata['speaker'] = args.speaker
        
        if args.start_time is not None:
            filter_metadata['start_seconds'] = {"$gte": args.start_time}
        
        if args.end_time is not None:
            filter_metadata['end_seconds'] = {"$lte": args.end_time}
        
        # View documents
        result = view_vector_store(
            podcast_id=args.podcast_id,
            limit=args.limit,
            offset=args.offset,
            include_embeddings=args.include_embeddings,
            filter_metadata=filter_metadata if filter_metadata else None
        )
        
        # Sort results if requested
        if args.sort_by == 'time' and 'documents' in result:
            result['documents'].sort(key=lambda x: x['metadata'].get('start_seconds', 0) if x.get('metadata') else 0)
            # Update document IDs to reflect new order
            for i, doc in enumerate(result['documents']):
                doc['id'] = i
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"Results written to {args.output}")
        else:
            # Print summary
            print(f"Podcast ID: {result.get('podcast_id')}")
            print(f"Total documents: {result.get('total_documents')}")
            print(f"Returned documents: {result.get('returned_documents')}")
            
            # Print documents (limited to avoid overwhelming the terminal)
            print("\nDocuments:")
            for i, doc in enumerate(result.get('documents', [])[:5]):  # Show only first 5 docs
                print(f"\n--- Document {doc.get('id')} ---")
                print(f"Content: {doc.get('content')[:200]}..." if len(doc.get('content', '')) > 200 else doc.get('content'))
                print(f"Metadata: {json.dumps(doc.get('metadata'), indent=2)}")
            
            if len(result.get('documents', [])) > 5:
                print(f"\n... and {len(result.get('documents', [])) - 5} more documents")
                print("Use --output to save full results to a file")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
