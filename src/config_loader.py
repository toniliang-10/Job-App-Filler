"""
Configuration loader for settings.yaml
"""

import yaml
from pathlib import Path
from typing import Dict, Any


def load_config(config_path: str = "config/settings.yaml") -> Dict[str, Any]:
    """
    Load configuration from YAML file.
    
    Args:
        config_path: Path to config file
        
    Returns:
        Dictionary with configuration
    """
    config_path = Path(config_path)
    
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config


def get_gemini_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Get Gemini configuration."""
    return config.get('gemini', {
        'model': 'gemini-1.5-flash',
        'temperature': 0.7,
        'max_tokens': 1024
    })


def get_rag_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Get RAG configuration."""
    return config.get('rag', {
        'top_k': 5,
        'similarity_threshold': 0.3,
        'embedding_model': 'all-MiniLM-L6-v2'
    })


def get_browser_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Get browser configuration."""
    return config.get('browser', {
        'headless': False,
        'slow_mo': 500,
        'timeout': 30000
    })


def get_auto_fill_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """Get auto-fill configuration."""
    return config.get('auto_fill', {
        'mode': 'interactive',
        'review_before_fill': True
    })

