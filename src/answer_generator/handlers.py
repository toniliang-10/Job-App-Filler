"""
Field type-specific handlers for answer generation.
"""

from typing import Dict, List, Optional
from .generator import AnswerGenerator
from ..browser_automation.detector import FormField, FieldType


class FieldHandler:
    """Handles answer generation for different field types."""
    
    def __init__(self, answer_generator: AnswerGenerator):
        """
        Initialize handler.
        
        Args:
            answer_generator: Answer generator instance
        """
        self.answer_generator = answer_generator
    
    def handle_field(self, field: FormField) -> Dict:
        """
        Generate answer for a field based on its type.
        
        Args:
            field: FormField object
            
        Returns:
            Dictionary with answer and metadata
        """
        # Construct question from field label and placeholder
        question = self._construct_question(field)
        
        # Generate answer based on field type
        if field.field_type == FieldType.TEXT or field.field_type == FieldType.EMAIL or field.field_type == FieldType.PHONE:
            return self._handle_text_field(field, question)
        
        elif field.field_type == FieldType.TEXTAREA:
            return self._handle_textarea(field, question)
        
        elif field.field_type == FieldType.SELECT:
            return self._handle_select(field, question)
        
        elif field.field_type == FieldType.RADIO:
            return self._handle_radio(field, question)
        
        elif field.field_type == FieldType.CHECKBOX:
            return self._handle_checkbox(field, question)
        
        elif field.field_type == FieldType.DATE:
            return self._handle_date(field, question)
        
        elif field.field_type == FieldType.NUMBER:
            return self._handle_number(field, question)
        
        else:
            return {
                'answer': '',
                'confidence': 0.0,
                'error': f'Unsupported field type: {field.field_type}'
            }
    
    def _construct_question(self, field: FormField) -> str:
        """Construct a question from field metadata."""
        question_parts = []
        
        if field.label:
            question_parts.append(field.label)
        
        if field.placeholder and field.placeholder != field.label:
            question_parts.append(f"({field.placeholder})")
        
        question = " ".join(question_parts)
        
        # Clean up the question
        question = question.strip()
        if not question.endswith('?'):
            question += '?'
        
        return question
    
    def _handle_text_field(self, field: FormField, question: str) -> Dict:
        """Handle text input field."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=field.field_type,
            max_length=500
        )
    
    def _handle_textarea(self, field: FormField, question: str) -> Dict:
        """Handle textarea field."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=field.field_type,
            max_length=2000
        )
    
    def _handle_select(self, field: FormField, question: str) -> Dict:
        """Handle select dropdown."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=FieldType.SELECT,
            options=field.options
        )
    
    def _handle_radio(self, field: FormField, question: str) -> Dict:
        """Handle radio button group."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=FieldType.RADIO,
            options=field.options
        )
    
    def _handle_checkbox(self, field: FormField, question: str) -> Dict:
        """Handle checkbox."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=FieldType.CHECKBOX
        )
    
    def _handle_date(self, field: FormField, question: str) -> Dict:
        """Handle date field."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=FieldType.DATE
        )
    
    def _handle_number(self, field: FormField, question: str) -> Dict:
        """Handle number field."""
        return self.answer_generator.generate_answer(
            question=question,
            field_type=FieldType.NUMBER
        )

