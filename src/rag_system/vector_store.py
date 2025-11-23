"""
Vector store using ChromaDB for semantic search and retrieval.
"""

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Any
from pathlib import Path
import uuid


class VectorStore:
    """Manages vector storage and retrieval using ChromaDB."""
    
    def __init__(
        self,
        persist_directory: str = "data/chroma_db",
        embedding_model: str = "all-MiniLM-L6-v2"
    ):
        """
        Initialize the vector store.
        
        Args:
            persist_directory: Directory to persist the database
            embedding_model: Name of the sentence-transformers model
        """
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory)
        )
        
        # Initialize embedding model
        print(f"Loading embedding model: {embedding_model}")
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Initialize collections
        self.documents_collection = self._get_or_create_collection("documents")
        self.history_collection = self._get_or_create_collection("answer_history")
    
    def _get_or_create_collection(self, name: str):
        """Get or create a collection."""
        try:
            collection = self.client.get_collection(name=name)
            print(f"✓ Loaded existing collection: {name}")
        except:
            collection = self.client.create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"}
            )
            print(f"✓ Created new collection: {name}")
        
        return collection
    
    def add_documents(self, chunks: List[Any], clear_existing: bool = False):
        """
        Add document chunks to the vector store.
        
        Args:
            chunks: List of DocumentChunk objects
            clear_existing: Whether to clear existing documents first
        """
        if clear_existing:
            print("Clearing existing documents...")
            try:
                self.client.delete_collection("documents")
                self.documents_collection = self._get_or_create_collection("documents")
            except:
                pass
        
        if not chunks:
            print("No chunks to add")
            return
        
        print(f"Adding {len(chunks)} chunks to vector store...")
        
        # Prepare data for ChromaDB
        ids = []
        texts = []
        metadatas = []
        
        for chunk in chunks:
            chunk_id = str(uuid.uuid4())
            ids.append(chunk_id)
            texts.append(chunk.text)
            metadatas.append(chunk.metadata)
        
        # Generate embeddings
        print("Generating embeddings...")
        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=True,
            convert_to_numpy=True
        ).tolist()
        
        # Add to collection in batches (ChromaDB has size limits)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            end_idx = min(i + batch_size, len(ids))
            
            self.documents_collection.add(
                ids=ids[i:end_idx],
                embeddings=embeddings[i:end_idx],
                documents=texts[i:end_idx],
                metadatas=metadatas[i:end_idx]
            )
        
        print(f"✓ Added {len(chunks)} chunks to vector store")
    
    def search_documents(
        self,
        query: str,
        top_k: int = 5,
        min_similarity: float = 0.0,
        filter_metadata: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Search for relevant documents.
        
        Args:
            query: Search query
            top_k: Number of results to return
            min_similarity: Minimum similarity threshold (0-1)
            filter_metadata: Optional metadata filters
            
        Returns:
            List of results with text, metadata, and similarity scores
        """
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query]).tolist()[0]
        
        # Search in ChromaDB
        results = self.documents_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_metadata
        )
        
        # Format results
        formatted_results = []
        
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                # Calculate similarity (ChromaDB returns distances)
                distance = results['distances'][0][i]
                similarity = 1 - distance  # Convert distance to similarity
                
                if similarity >= min_similarity:
                    formatted_results.append({
                        'id': results['ids'][0][i],
                        'text': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'similarity': similarity
                    })
        
        return formatted_results
    
    def add_answer_to_history(
        self,
        question: str,
        answer: str,
        metadata: Optional[Dict] = None
    ):
        """
        Add a question-answer pair to history.
        
        Args:
            question: The question text
            answer: The answer text
            metadata: Optional metadata (field type, confidence, etc.)
        """
        answer_id = str(uuid.uuid4())
        
        # Generate embedding for the question
        embedding = self.embedding_model.encode([question]).tolist()[0]
        
        # Prepare metadata
        full_metadata = metadata or {}
        full_metadata['answer'] = answer
        
        # Add to history collection
        self.history_collection.add(
            ids=[answer_id],
            embeddings=[embedding],
            documents=[question],
            metadatas=[full_metadata]
        )
    
    def search_answer_history(
        self,
        query: str,
        top_k: int = 3
    ) -> List[Dict]:
        """
        Search for similar questions in answer history.
        
        Args:
            query: Query text (question)
            top_k: Number of results to return
            
        Returns:
            List of similar question-answer pairs
        """
        # Generate query embedding
        query_embedding = self.embedding_model.encode([query]).tolist()[0]
        
        # Search in history
        results = self.history_collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # Format results
        formatted_results = []
        
        if results['ids'] and results['ids'][0]:
            for i in range(len(results['ids'][0])):
                distance = results['distances'][0][i]
                similarity = 1 - distance
                
                metadata = results['metadatas'][0][i]
                answer = metadata.pop('answer', '')
                
                formatted_results.append({
                    'question': results['documents'][0][i],
                    'answer': answer,
                    'similarity': similarity,
                    'metadata': metadata
                })
        
        return formatted_results
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the collections."""
        docs_count = self.documents_collection.count()
        history_count = self.history_collection.count()
        
        return {
            'documents': docs_count,
            'answer_history': history_count
        }
    
    def clear_all(self):
        """Clear all collections."""
        try:
            self.client.delete_collection("documents")
            self.client.delete_collection("answer_history")
            self.documents_collection = self._get_or_create_collection("documents")
            self.history_collection = self._get_or_create_collection("answer_history")
            print("✓ Cleared all collections")
        except Exception as e:
            print(f"Error clearing collections: {e}")

