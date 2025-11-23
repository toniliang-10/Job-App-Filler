"""
Document ingestion pipeline for processing and storing documents.
"""

import os
from pathlib import Path
from typing import List, Optional
import json
from datetime import datetime

from .parser import DocumentParser, DocumentChunk


class DocumentIngestionPipeline:
    """Pipeline for ingesting documents into the RAG system."""
    
    def __init__(self, documents_dir: str = "data/documents", chunk_size: int = 500):
        """
        Initialize the ingestion pipeline.
        
        Args:
            documents_dir: Directory containing documents to ingest
            chunk_size: Size of text chunks
        """
        self.documents_dir = Path(documents_dir)
        self.parser = DocumentParser(chunk_size=chunk_size)
        self.supported_extensions = ['.pdf', '.docx', '.txt']
    
    def scan_documents(self) -> List[Path]:
        """
        Scan the documents directory for supported files.
        
        Returns:
            List of file paths
        """
        if not self.documents_dir.exists():
            self.documents_dir.mkdir(parents=True, exist_ok=True)
            return []
        
        documents = []
        for ext in self.supported_extensions:
            documents.extend(self.documents_dir.glob(f'*{ext}'))
        
        return sorted(documents)
    
    def ingest_document(self, file_path: Path) -> List[DocumentChunk]:
        """
        Ingest a single document.
        
        Args:
            file_path: Path to the document
            
        Returns:
            List of document chunks
        """
        print(f"Ingesting: {file_path.name}")
        
        try:
            chunks = self.parser.parse_file(str(file_path))
            print(f"  ✓ Extracted {len(chunks)} chunks")
            return chunks
        except Exception as e:
            print(f"  ✗ Error: {e}")
            return []
    
    def ingest_all_documents(self) -> List[DocumentChunk]:
        """
        Ingest all documents in the documents directory.
        
        Returns:
            List of all document chunks
        """
        documents = self.scan_documents()
        
        if not documents:
            print(f"No documents found in {self.documents_dir}")
            print(f"Please add PDF, DOCX, or TXT files to this directory.")
            return []
        
        print(f"\nFound {len(documents)} document(s) to process:")
        for doc in documents:
            print(f"  - {doc.name}")
        
        print("\nProcessing documents...")
        all_chunks = []
        
        for doc_path in documents:
            chunks = self.ingest_document(doc_path)
            all_chunks.extend(chunks)
        
        print(f"\n✓ Total chunks created: {len(all_chunks)}")
        return all_chunks
    
    def get_document_metadata(self, file_path: Path) -> dict:
        """
        Get metadata for a document.
        
        Args:
            file_path: Path to the document
            
        Returns:
            Dictionary with metadata
        """
        stat = file_path.stat()
        return {
            'filename': file_path.name,
            'filepath': str(file_path),
            'size_bytes': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'extension': file_path.suffix
        }
    
    def export_chunks_to_json(self, chunks: List[DocumentChunk], output_path: str):
        """
        Export chunks to JSON for debugging/inspection.
        
        Args:
            chunks: List of document chunks
            output_path: Path to save JSON file
        """
        data = []
        for chunk in chunks:
            data.append({
                'text': chunk.text,
                'metadata': chunk.metadata
            })
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(chunks)} chunks to {output_path}")

