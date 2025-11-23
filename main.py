"""
Job Application Filler - Main Application
"""

import sys
import argparse
from pathlib import Path

from src.config_loader import (
    load_config, get_gemini_config, get_rag_config,
    get_browser_config, get_auto_fill_config
)
from src.document_processor.ingestion import DocumentIngestionPipeline
from src.rag_system.vector_store import VectorStore
from src.llm_integration.gemini_client import GeminiClient
from src.answer_generator.retriever import ContextRetriever
from src.answer_generator.generator import AnswerGenerator
from src.answer_generator.handlers import FieldHandler
from src.history_tracker.tracker import AnswerHistoryTracker
from src.browser_automation.detector import FormFieldDetector
from src.browser_automation.filler import FormFieldFiller

from playwright.sync_api import sync_playwright


def print_banner():
    """Print application banner."""
    print("""
╔═══════════════════════════════════════════════════════╗
║     Job Application Filler with RAG & Gemini         ║
║           Intelligent Form Automation                 ║
╚═══════════════════════════════════════════════════════╝
""")


def cmd_status(args):
    """Check system status."""
    print("\n=== System Status ===\n")
    
    # Check config file
    try:
        config = load_config()
        print("✓ Configuration file loaded")
    except Exception as e:
        print(f"✗ Configuration error: {e}")
        return
    
    # Check API key
    try:
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key and api_key != 'your_api_key_here':
            print("✓ Gemini API key configured")
        else:
            print("✗ Gemini API key not set (check .env file)")
            return
    except Exception as e:
        print(f"✗ Error checking API key: {e}")
    
    # Check documents
    docs_dir = Path("data/documents")
    if docs_dir.exists():
        docs = list(docs_dir.glob('*.*'))
        print(f"✓ Documents directory: {len(docs)} file(s)")
    else:
        print("⚠ Documents directory not found")
    
    # Check vector store
    try:
        rag_config = get_rag_config(config)
        vector_store = VectorStore(
            embedding_model=rag_config['embedding_model']
        )
        stats = vector_store.get_collection_stats()
        print(f"✓ Vector store: {stats['documents']} documents, {stats['answer_history']} answers")
    except Exception as e:
        print(f"⚠ Vector store: {e}")
    
    # Check history
    try:
        tracker = AnswerHistoryTracker()
        stats = tracker.get_stats()
        print(f"✓ Answer history: {stats['total_entries']} entries")
    except Exception as e:
        print(f"⚠ Answer history: {e}")
    
    print()


def cmd_test_llm(args):
    """Test LLM connection."""
    print("\n=== Testing Gemini Connection ===\n")
    
    try:
        config = load_config()
        gemini_config = get_gemini_config(config)
        
        client = GeminiClient(
            model_name=gemini_config['model'],
            temperature=gemini_config['temperature'],
            max_tokens=gemini_config['max_tokens']
        )
        
        print("Sending test request...")
        if client.test_connection():
            print("✓ Connection successful!")
        else:
            print("✗ Connection failed")
            
    except Exception as e:
        print(f"✗ Error: {e}")


def cmd_ingest(args):
    """Ingest documents."""
    print("\n=== Document Ingestion ===\n")
    
    try:
        config = load_config()
        rag_config = get_rag_config(config)
        
        # Initialize components
        pipeline = DocumentIngestionPipeline()
        vector_store = VectorStore(
            embedding_model=rag_config['embedding_model']
        )
        
        # Ingest documents
        chunks = pipeline.ingest_all_documents()
        
        if not chunks:
            print("\n⚠ No documents to ingest")
            print(f"Please add PDF, DOCX, or TXT files to: data/documents/")
            return
        
        # Add to vector store
        vector_store.add_documents(chunks, clear_existing=args.rebuild)
        
        print(f"\n✓ Ingestion complete!")
        stats = vector_store.get_collection_stats()
        print(f"Total documents in database: {stats['documents']}")
        
    except Exception as e:
        print(f"\n✗ Error during ingestion: {e}")
        import traceback
        traceback.print_exc()


def cmd_search(args):
    """Search knowledge base."""
    print(f"\n=== Searching: '{args.query}' ===\n")
    
    try:
        config = load_config()
        rag_config = get_rag_config(config)
        
        vector_store = VectorStore(
            embedding_model=rag_config['embedding_model']
        )
        
        results = vector_store.search_documents(
            query=args.query,
            top_k=args.top_k or rag_config['top_k']
        )
        
        if not results:
            print("No results found")
            return
        
        for i, result in enumerate(results, 1):
            print(f"\n--- Result {i} (Similarity: {result['similarity']:.2%}) ---")
            print(f"Source: {result['metadata'].get('filename', 'Unknown')}")
            print(f"Section: {result['metadata'].get('section', 'N/A')}")
            print(f"Text: {result['text'][:200]}...")
        
    except Exception as e:
        print(f"✗ Error: {e}")


def cmd_history(args):
    """View answer history."""
    print("\n=== Answer History ===\n")
    
    try:
        tracker = AnswerHistoryTracker()
        
        if args.stats:
            stats = tracker.get_stats()
            print(f"Total entries: {stats['total_entries']}")
            print(f"Edited answers: {stats['edited_count']}")
            print(f"Average confidence: {stats['avg_confidence']:.2%}")
            print(f"\nField types:")
            for field_type, count in stats['field_types'].items():
                print(f"  {field_type}: {count}")
        else:
            entries = tracker.get_recent_entries(args.recent or 10)
            
            if not entries:
                print("No history entries found")
                return
            
            for i, entry in enumerate(entries, 1):
                print(f"\n--- Entry {i} ---")
                print(f"Question: {entry['question']}")
                print(f"Answer: {entry['answer']}")
                print(f"Type: {entry['field_type']} | Confidence: {entry.get('confidence', 0):.2%}")
                if entry.get('was_edited'):
                    print("(Edited by user)")
    
    except Exception as e:
        print(f"✗ Error: {e}")


def cmd_list_documents(args):
    """List ingested documents."""
    print("\n=== Ingested Documents ===\n")
    
    try:
        pipeline = DocumentIngestionPipeline()
        documents = pipeline.scan_documents()
        
        if not documents:
            print("No documents found")
            print(f"Add documents to: data/documents/")
            return
        
        for doc in documents:
            metadata = pipeline.get_document_metadata(doc)
            print(f"\n{metadata['filename']}")
            print(f"  Size: {metadata['size_bytes']:,} bytes")
            print(f"  Modified: {metadata['modified']}")
    
    except Exception as e:
        print(f"✗ Error: {e}")


def cmd_fill(args):
    """Fill job application."""
    print("\n=== Job Application Filler ===\n")
    
    try:
        # Load config
        config = load_config()
        gemini_config = get_gemini_config(config)
        rag_config = get_rag_config(config)
        browser_config = get_browser_config(config)
        auto_fill_config = get_auto_fill_config(config)
        
        # Override mode if specified
        if args.mode:
            auto_fill_config['mode'] = args.mode
        
        # Initialize components
        print("Initializing components...")
        
        vector_store = VectorStore(
            embedding_model=rag_config['embedding_model']
        )
        
        llm_client = GeminiClient(
            model_name=gemini_config['model'],
            temperature=gemini_config['temperature'],
            max_tokens=gemini_config['max_tokens']
        )
        
        context_retriever = ContextRetriever(
            vector_store=vector_store,
            top_k=rag_config['top_k'],
            similarity_threshold=rag_config['similarity_threshold']
        )
        
        answer_generator = AnswerGenerator(
            llm_client=llm_client,
            context_retriever=context_retriever,
            use_history=True
        )
        
        field_handler = FieldHandler(answer_generator)
        history_tracker = AnswerHistoryTracker()
        
        # Launch browser
        print("\nLaunching browser...")
        print("Navigate to the job application page, then press ENTER here.")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=browser_config['headless'],
                slow_mo=browser_config['slow_mo']
            )
            
            page = browser.new_page()
            page.set_default_timeout(browser_config['timeout'])
            
            # Wait for user to navigate
            input("\nPress ENTER when you're on the application page...")
            
            # Detect fields
            print("\nDetecting form fields...")
            detector = FormFieldDetector(page)
            fields = detector.detect_all_fields()
            
            if not fields:
                print("No form fields detected on this page")
                browser.close()
                return
            
            # Initialize filler
            filler = FormFieldFiller(page, slow_mo=browser_config['slow_mo'])
            
            # Process each field
            mode = auto_fill_config['mode']
            filled_count = 0
            
            for i, field in enumerate(fields, 1):
                print(f"\n{'='*60}")
                print(f"Field {i}/{len(fields)}")
                print(f"Type: {field.field_type}")
                print(f"Label: {field.label}")
                if field.required:
                    print("(Required)")
                
                # Scroll to field
                filler.scroll_to_field(field)
                
                # Generate answer
                print("\nGenerating answer...")
                result = field_handler.handle_field(field)
                
                if 'error' in result:
                    print(f"  ⚠ {result['error']}")
                    continue
                
                answer = result['answer']
                confidence = result['confidence']
                
                print(f"\nGenerated Answer: {answer}")
                print(f"Confidence: {confidence:.1%}")
                
                # Handle based on mode
                if mode == 'interactive' or mode == 'suggest-only':
                    # Show options
                    print("\n[F] Fill  [E] Edit  [S] Skip  [Q] Quit")
                    choice = input("Your choice: ").strip().lower()
                    
                    if choice == 'q':
                        print("Quitting...")
                        break
                    elif choice == 's':
                        print("Skipped")
                        continue
                    elif choice == 'e':
                        answer = input("Enter your answer: ").strip()
                    elif choice != 'f':
                        print("Invalid choice, skipping...")
                        continue
                    
                    # Fill if not suggest-only mode
                    if mode != 'suggest-only':
                        if filler.fill_field(field, answer):
                            print("✓ Filled")
                            filled_count += 1
                        else:
                            print("✗ Failed to fill")
                
                elif mode == 'batch':
                    # Auto-fill without asking
                    if filler.fill_field(field, answer):
                        print("✓ Filled")
                        filled_count += 1
                    else:
                        print("✗ Failed to fill")
                
                # Save to history
                history_tracker.add_entry(
                    question=field.label,
                    answer=answer,
                    field_type=field.field_type,
                    confidence=confidence,
                    was_edited=(mode == 'interactive' and choice == 'e')
                )
                
                # Also add to vector store
                vector_store.add_answer_to_history(
                    question=field.label,
                    answer=answer,
                    metadata={'field_type': field.field_type, 'confidence': confidence}
                )
            
            print(f"\n{'='*60}")
            print(f"\n✓ Processing complete!")
            print(f"Filled {filled_count}/{len(fields)} fields")
            print("\nPlease review the form and submit manually.")
            input("\nPress ENTER to close browser...")
            
            browser.close()
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main entry point."""
    print_banner()
    
    parser = argparse.ArgumentParser(
        description='Job Application Filler with RAG & Gemini'
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    subparsers.add_parser('status', help='Check system status')
    
    # Test LLM command
    subparsers.add_parser('test-llm', help='Test Gemini connection')
    
    # Ingest command
    ingest_parser = subparsers.add_parser('ingest', help='Ingest documents')
    ingest_parser.add_argument('--rebuild', action='store_true',
                               help='Rebuild database from scratch')
    ingest_parser.add_argument('--update', action='store_true',
                               help='Update with new documents')
    
    # Search command
    search_parser = subparsers.add_parser('search', help='Search knowledge base')
    search_parser.add_argument('query', help='Search query')
    search_parser.add_argument('--top-k', type=int, help='Number of results')
    
    # History command
    history_parser = subparsers.add_parser('history', help='View answer history')
    history_parser.add_argument('--recent', type=int, help='Show N recent entries')
    history_parser.add_argument('--stats', action='store_true', help='Show statistics')
    
    # List documents command
    subparsers.add_parser('list-documents', help='List ingested documents')
    
    # Fill command
    fill_parser = subparsers.add_parser('fill', help='Fill job application')
    fill_parser.add_argument('--mode', choices=['interactive', 'batch', 'suggest-only'],
                            help='Fill mode')
    fill_parser.add_argument('--interactive', action='store_const', const='interactive',
                            dest='mode', help='Interactive mode')
    fill_parser.add_argument('--batch', action='store_const', const='batch',
                            dest='mode', help='Batch mode')
    fill_parser.add_argument('--suggest-only', action='store_const', const='suggest-only',
                            dest='mode', help='Suggest only (no filling)')
    
    args = parser.parse_args()
    
    # Execute command
    if args.command == 'status':
        cmd_status(args)
    elif args.command == 'test-llm':
        cmd_test_llm(args)
    elif args.command == 'ingest':
        cmd_ingest(args)
    elif args.command == 'search':
        cmd_search(args)
    elif args.command == 'history':
        cmd_history(args)
    elif args.command == 'list-documents':
        cmd_list_documents(args)
    elif args.command == 'fill':
        cmd_fill(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

