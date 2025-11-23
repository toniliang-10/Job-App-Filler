"""
Answer history tracker for storing and learning from previous answers.
"""

import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class AnswerHistoryTracker:
    """Tracks question-answer pairs for learning and improvement."""
    
    def __init__(self, history_file: str = "data/answer_history.json"):
        """
        Initialize tracker.
        
        Args:
            history_file: Path to JSON file for storing history
        """
        self.history_file = Path(history_file)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing history
        self.history = self._load_history()
    
    def _load_history(self) -> List[Dict]:
        """Load history from file."""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading history: {e}")
                return []
        return []
    
    def _save_history(self):
        """Save history to file."""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving history: {e}")
    
    def add_entry(
        self,
        question: str,
        answer: str,
        field_type: str,
        confidence: float,
        was_edited: bool = False,
        metadata: Optional[Dict] = None
    ):
        """
        Add a question-answer pair to history.
        
        Args:
            question: The question text
            answer: The answer text
            field_type: Type of field
            confidence: Confidence score
            was_edited: Whether the answer was edited by user
            metadata: Additional metadata
        """
        entry = {
            'question': question,
            'answer': answer,
            'field_type': field_type,
            'confidence': confidence,
            'was_edited': was_edited,
            'timestamp': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        self.history.append(entry)
        self._save_history()
    
    def get_recent_entries(self, n: int = 10) -> List[Dict]:
        """Get N most recent entries."""
        return self.history[-n:] if self.history else []
    
    def get_entries_by_field_type(self, field_type: str) -> List[Dict]:
        """Get all entries for a specific field type."""
        return [entry for entry in self.history if entry.get('field_type') == field_type]
    
    def search_entries(self, query: str) -> List[Dict]:
        """
        Search for entries containing query.
        
        Args:
            query: Search query
            
        Returns:
            List of matching entries
        """
        query_lower = query.lower()
        results = []
        
        for entry in self.history:
            if (query_lower in entry['question'].lower() or 
                query_lower in entry['answer'].lower()):
                results.append(entry)
        
        return results
    
    def update_entry(self, index: int, new_answer: str):
        """
        Update an entry's answer.
        
        Args:
            index: Index of entry to update
            new_answer: New answer text
        """
        if 0 <= index < len(self.history):
            self.history[index]['answer'] = new_answer
            self.history[index]['was_edited'] = True
            self.history[index]['last_modified'] = datetime.now().isoformat()
            self._save_history()
    
    def delete_entry(self, index: int):
        """Delete an entry."""
        if 0 <= index < len(self.history):
            del self.history[index]
            self._save_history()
    
    def get_stats(self) -> Dict:
        """Get statistics about answer history."""
        if not self.history:
            return {
                'total_entries': 0,
                'edited_count': 0,
                'avg_confidence': 0.0,
                'field_types': {}
            }
        
        edited_count = sum(1 for entry in self.history if entry.get('was_edited', False))
        avg_confidence = sum(entry.get('confidence', 0.0) for entry in self.history) / len(self.history)
        
        field_types = {}
        for entry in self.history:
            field_type = entry.get('field_type', 'unknown')
            field_types[field_type] = field_types.get(field_type, 0) + 1
        
        return {
            'total_entries': len(self.history),
            'edited_count': edited_count,
            'avg_confidence': avg_confidence,
            'field_types': field_types
        }
    
    def export_to_json(self, output_path: str):
        """Export history to a JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, indent=2, ensure_ascii=False)
        print(f"✓ Exported history to {output_path}")
    
    def import_from_json(self, input_path: str):
        """Import history from a JSON file."""
        with open(input_path, 'r', encoding='utf-8') as f:
            imported = json.load(f)
        
        self.history.extend(imported)
        self._save_history()
        print(f"✓ Imported {len(imported)} entries from {input_path}")
    
    def clear_all(self):
        """Clear all history."""
        self.history = []
        self._save_history()
        print("✓ Cleared all answer history")

