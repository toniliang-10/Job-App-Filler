"""
Flask API Server for Chrome Extension
Provides RESTful API for the Job Application Filler
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from pathlib import Path

from src.config_loader import (
    load_config, get_gemini_config, get_rag_config
)
from src.rag_system.vector_store import VectorStore
from src.llm_integration.gemini_client import GeminiClient
from src.answer_generator.retriever import ContextRetriever
from src.answer_generator.generator import AnswerGenerator
from src.history_tracker.tracker import AnswerHistoryTracker
from src.document_processor.ingestion import DocumentIngestionPipeline

app = Flask(__name__)
CORS(app)  # Enable CORS for Chrome extension

# Global components (initialized on startup)
vector_store = None
llm_client = None
answer_generator = None
history_tracker = None


def initialize_components():
    """Initialize all components on server startup."""
    global vector_store, llm_client, answer_generator, history_tracker
    
    try:
        print("Initializing Job Application Filler API Server...")
        
        # Load config
        config = load_config()
        gemini_config = get_gemini_config(config)
        rag_config = get_rag_config(config)
        
        # Initialize components
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
        
        history_tracker = AnswerHistoryTracker()
        
        print("✓ Server initialized successfully!")
        
    except Exception as e:
        print(f"✗ Error initializing server: {e}")
        raise


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'message': 'Job Application Filler API is running'
    })


@app.route('/api/status', methods=['GET'])
def get_status():
    """Get system status."""
    try:
        stats = vector_store.get_collection_stats()
        history_stats = history_tracker.get_stats()
        
        return jsonify({
            'status': 'ok',
            'documents': stats['documents'],
            'answer_history': stats['answer_history'],
            'total_answers': history_stats['total_entries']
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/generate-answer', methods=['POST'])
def generate_answer():
    """
    Generate answer for a form field.
    
    Request body:
    {
        "question": "What is your experience with Python?",
        "field_type": "textarea",
        "options": ["Option 1", "Option 2"],  // Optional, for select/radio
        "max_length": 500  // Optional
    }
    """
    try:
        data = request.json
        
        question = data.get('question', '')
        field_type = data.get('field_type', 'text')
        options = data.get('options')
        max_length = data.get('max_length')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Generate answer
        result = answer_generator.generate_answer(
            question=question,
            field_type=field_type,
            options=options,
            max_length=max_length
        )
        
        # Save to history
        if result.get('answer'):
            history_tracker.add_entry(
                question=question,
                answer=result['answer'],
                field_type=field_type,
                confidence=result.get('confidence', 0.0),
                was_edited=False
            )
            
            # Also add to vector store
            vector_store.add_answer_to_history(
                question=question,
                answer=result['answer'],
                metadata={
                    'field_type': field_type,
                    'confidence': result.get('confidence', 0.0)
                }
            )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/search', methods=['POST'])
def search_documents():
    """
    Search the knowledge base.
    
    Request body:
    {
        "query": "Python experience",
        "top_k": 5
    }
    """
    try:
        data = request.json
        query = data.get('query', '')
        top_k = data.get('top_k', 5)
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        results = vector_store.search_documents(
            query=query,
            top_k=top_k
        )
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/ingest', methods=['POST'])
def ingest_documents():
    """
    Trigger document ingestion.
    
    Request body:
    {
        "rebuild": false
    }
    """
    try:
        data = request.json or {}
        rebuild = data.get('rebuild', False)
        
        pipeline = DocumentIngestionPipeline()
        chunks = pipeline.ingest_all_documents()
        
        if not chunks:
            return jsonify({
                'status': 'warning',
                'message': 'No documents found',
                'chunks': 0
            })
        
        vector_store.add_documents(chunks, clear_existing=rebuild)
        
        stats = vector_store.get_collection_stats()
        
        return jsonify({
            'status': 'success',
            'message': 'Documents ingested successfully',
            'chunks': len(chunks),
            'total_documents': stats['documents']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get recent answer history."""
    try:
        recent = int(request.args.get('recent', 10))
        entries = history_tracker.get_recent_entries(recent)
        
        return jsonify({'entries': entries})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/batch-generate', methods=['POST'])
def batch_generate():
    """
    Generate answers for multiple fields at once.
    
    Request body:
    {
        "fields": [
            {"question": "Name?", "field_type": "text"},
            {"question": "Email?", "field_type": "email"},
            ...
        ]
    }
    """
    try:
        data = request.json
        fields = data.get('fields', [])
        
        if not fields:
            return jsonify({'error': 'Fields array is required'}), 400
        
        results = []
        
        for field in fields:
            question = field.get('question', '')
            field_type = field.get('field_type', 'text')
            options = field.get('options')
            
            if question:
                result = answer_generator.generate_answer(
                    question=question,
                    field_type=field_type,
                    options=options
                )
                
                results.append({
                    'question': question,
                    'answer': result.get('answer', ''),
                    'confidence': result.get('confidence', 0.0),
                    'field_type': field_type
                })
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def main():
    """Run the API server."""
    initialize_components()
    
    print("\n" + "="*60)
    print("Job Application Filler API Server")
    print("="*60)
    print("\nServer running on: http://localhost:5000")
    print("\nAPI Endpoints:")
    print("  GET  /api/health          - Health check")
    print("  GET  /api/status          - System status")
    print("  POST /api/generate-answer - Generate answer for field")
    print("  POST /api/search          - Search knowledge base")
    print("  POST /api/ingest          - Ingest documents")
    print("  GET  /api/history         - Get answer history")
    print("  POST /api/batch-generate  - Generate multiple answers")
    print("\nPress Ctrl+C to stop")
    print("="*60 + "\n")
    
    app.run(host='localhost', port=5000, debug=False)


if __name__ == '__main__':
    main()

