"""
Google Gemini API client for answer generation.
"""

import os
import time
from typing import Optional, Dict, List
import google.generativeai as genai
from dotenv import load_dotenv


class GeminiClient:
    """Client for interacting with Google Gemini API."""
    
    def __init__(
        self,
        model_name: str = "gemini-1.5-flash",
        temperature: float = 0.7,
        max_tokens: int = 1024
    ):
        """
        Initialize Gemini client.
        
        Args:
            model_name: Name of the Gemini model to use
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        """
        # Load environment variables
        load_dotenv()
        
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key or api_key == 'your_api_key_here':
            raise ValueError(
                "GEMINI_API_KEY not found in environment. "
                "Please set it in your .env file. "
                "Get your key from: https://makersuite.google.com/app/apikey"
            )
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        # Initialize model
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            },
        ]
        
        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        print(f"✓ Initialized Gemini model: {model_name}")
    
    def generate(
        self,
        prompt: str,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ) -> str:
        """
        Generate text using Gemini.
        
        Args:
            prompt: The prompt to send to Gemini
            max_retries: Maximum number of retry attempts
            retry_delay: Delay between retries in seconds
            
        Returns:
            Generated text
        """
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt)
                
                # Check if response was blocked
                if not response.text:
                    if hasattr(response, 'prompt_feedback'):
                        print(f"Warning: Response blocked. Reason: {response.prompt_feedback}")
                    return ""
                
                return response.text.strip()
                
            except Exception as e:
                error_msg = str(e)
                
                # Handle rate limiting
                if "429" in error_msg or "quota" in error_msg.lower():
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                        print(f"Rate limit hit. Waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                        continue
                    else:
                        raise Exception("Rate limit exceeded. Please wait and try again.")
                
                # Handle other errors
                if attempt < max_retries - 1:
                    print(f"Error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Failed to generate response: {error_msg}")
        
        return ""
    
    def generate_with_context(
        self,
        question: str,
        context: List[str],
        field_type: str = "text",
        options: Optional[List[str]] = None
    ) -> str:
        """
        Generate answer with retrieved context.
        
        Args:
            question: The question to answer
            context: List of relevant context strings
            field_type: Type of field (text, select, radio, etc.)
            options: Available options for select/radio fields
            
        Returns:
            Generated answer
        """
        from .prompts import create_prompt
        
        prompt = create_prompt(
            question=question,
            context=context,
            field_type=field_type,
            options=options
        )
        
        return self.generate(prompt)
    
    def test_connection(self) -> bool:
        """
        Test connection to Gemini API.
        
        Returns:
            True if connection successful
        """
        try:
            response = self.generate("Say 'OK' if you can read this.")
            return len(response) > 0
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

