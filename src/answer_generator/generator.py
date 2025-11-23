"""
Answer generation combining RAG and LLM.
"""

from typing import List, Dict, Optional
from ..llm_integration.gemini_client import GeminiClient
from ..llm_integration.prompts import create_prompt, create_prompt_with_examples
from .retriever import ContextRetriever


class AnswerGenerator:
    """Generates answers using RAG and LLM."""
    
    def __init__(
        self,
        llm_client: GeminiClient,
        context_retriever: ContextRetriever,
        use_history: bool = True
    ):
        """
        Initialize answer generator.
        
        Args:
            llm_client: LLM client instance
            context_retriever: Context retriever instance
            use_history: Whether to use answer history for few-shot learning
        """
        self.llm_client = llm_client
        self.context_retriever = context_retriever
        self.use_history = use_history
    
    def generate_answer(
        self,
        question: str,
        field_type: str = "text",
        options: Optional[List[str]] = None,
        max_length: Optional[int] = None
    ) -> Dict:
        """
        Generate answer for a question.
        
        Args:
            question: The question to answer
            field_type: Type of field (text, select, radio, etc.)
            options: Available options for select/radio fields
            max_length: Maximum length for text answers
            
        Returns:
            Dictionary with 'answer', 'confidence', 'context_used'
        """
        # Retrieve context and similar questions
        retrieval_result = self.context_retriever.retrieve_all(question)
        context = retrieval_result['context']
        similar_questions = retrieval_result['similar_questions']
        confidence = retrieval_result['confidence']
        
        # Check if we have enough context
        if not context:
            print(f"  ⚠ No relevant context found for: {question}")
            return {
                'answer': "",
                'confidence': 0.0,
                'context_used': [],
                'error': 'No relevant context found'
            }
        
        # Generate prompt
        if self.use_history and similar_questions:
            prompt = create_prompt_with_examples(
                question=question,
                context=context,
                similar_qa_pairs=similar_questions,
                field_type=field_type
            )
        else:
            prompt = create_prompt(
                question=question,
                context=context,
                field_type=field_type,
                options=options,
                max_length=max_length
            )
        
        # Generate answer
        try:
            answer = self.llm_client.generate(prompt)
            
            # Post-process answer
            answer = self._post_process_answer(answer, field_type, options)
            
            return {
                'answer': answer,
                'confidence': confidence,
                'context_used': context,
                'similar_questions': similar_questions if self.use_history else []
            }
            
        except Exception as e:
            print(f"  ✗ Error generating answer: {e}")
            return {
                'answer': "",
                'confidence': 0.0,
                'context_used': context,
                'error': str(e)
            }
    
    def _post_process_answer(
        self,
        answer: str,
        field_type: str,
        options: Optional[List[str]] = None
    ) -> str:
        """
        Post-process generated answer based on field type.
        
        Args:
            answer: Generated answer
            field_type: Type of field
            options: Available options (for validation)
            
        Returns:
            Processed answer
        """
        answer = answer.strip()
        
        # Handle select/radio fields
        if field_type in ['select', 'radio'] and options:
            # Check if answer is in options (case-insensitive)
            answer_lower = answer.lower()
            for option in options:
                if option.lower() == answer_lower:
                    return option
            
            # If not exact match, return as is (filler will do fuzzy matching)
            return answer
        
        # Handle boolean fields
        if field_type in ['checkbox', 'boolean']:
            answer_lower = answer.lower()
            if any(word in answer_lower for word in ['yes', 'true', 'correct', 'agree']):
                return 'Yes'
            else:
                return 'No'
        
        # Handle date fields
        if field_type == 'date':
            # Basic date validation/formatting
            import re
            # Look for date patterns
            date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
            match = re.search(date_pattern, answer)
            if match:
                return match.group()
        
        # Handle number fields
        if field_type == 'number':
            # Extract just numbers
            import re
            numbers = re.findall(r'\d+', answer)
            if numbers:
                return numbers[0]
        
        return answer

