"""
Context retrieval for answer generation.
"""

from typing import List, Dict, Optional
from ..rag_system.vector_store import VectorStore


class ContextRetriever:
    """Retrieves relevant context for answering questions."""
    
    def __init__(
        self,
        vector_store: VectorStore,
        top_k: int = 5,
        similarity_threshold: float = 0.3
    ):
        """
        Initialize retriever.
        
        Args:
            vector_store: Vector store instance
            top_k: Number of results to retrieve
            similarity_threshold: Minimum similarity score
        """
        self.vector_store = vector_store
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold
    
    def retrieve_context(self, question: str) -> List[str]:
        """
        Retrieve relevant context for a question.
        
        Args:
            question: The question to answer
            
        Returns:
            List of relevant text chunks
        """
        results = self.vector_store.search_documents(
            query=question,
            top_k=self.top_k,
            min_similarity=self.similarity_threshold
        )
        
        # Extract just the text
        context = [result['text'] for result in results]
        
        return context
    
    def retrieve_similar_questions(self, question: str, top_k: int = 3) -> List[Dict]:
        """
        Retrieve similar questions from answer history.
        
        Args:
            question: The question to find similar ones for
            top_k: Number of similar questions to retrieve
            
        Returns:
            List of similar question-answer pairs
        """
        results = self.vector_store.search_answer_history(
            query=question,
            top_k=top_k
        )
        
        return results
    
    def retrieve_all(self, question: str) -> Dict:
        """
        Retrieve both context and similar questions.
        
        Args:
            question: The question to answer
            
        Returns:
            Dictionary with 'context' and 'similar_questions'
        """
        context = self.retrieve_context(question)
        similar_questions = self.retrieve_similar_questions(question)
        
        return {
            'context': context,
            'similar_questions': similar_questions,
            'confidence': self._calculate_confidence(context)
        }
    
    def _calculate_confidence(self, context: List[str]) -> float:
        """
        Calculate confidence score based on retrieved context.
        
        Args:
            context: List of context strings
            
        Returns:
            Confidence score (0.0 to 1.0)
        """
        if not context:
            return 0.0
        
        # Simple heuristic: more context = higher confidence
        # In a real system, you'd want to look at similarity scores
        if len(context) >= self.top_k:
            return 0.9
        elif len(context) >= 3:
            return 0.7
        elif len(context) >= 1:
            return 0.5
        else:
            return 0.2

