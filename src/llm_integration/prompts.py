"""
Prompt templates for different question types.
"""

from typing import List, Optional


def create_prompt(
    question: str,
    context: List[str],
    field_type: str = "text",
    options: Optional[List[str]] = None,
    max_length: Optional[int] = None
) -> str:
    """
    Create a prompt based on question type and context.
    
    Args:
        question: The question to answer
        context: List of relevant context strings
        field_type: Type of field (text, select, radio, checkbox, date, etc.)
        options: Available options for select/radio fields
        max_length: Maximum length constraint for the answer
        
    Returns:
        Formatted prompt string
    """
    if field_type == "select" or field_type == "radio":
        return _create_selection_prompt(question, context, options or [])
    elif field_type == "checkbox" or field_type == "boolean":
        return _create_boolean_prompt(question, context)
    elif field_type == "date":
        return _create_date_prompt(question, context)
    elif field_type == "number":
        return _create_number_prompt(question, context)
    else:
        return _create_text_prompt(question, context, max_length)


def _create_text_prompt(
    question: str,
    context: List[str],
    max_length: Optional[int] = None
) -> str:
    """Create prompt for text/textarea fields."""
    
    context_text = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
    
    length_instruction = ""
    if max_length:
        length_instruction = f"\n- Keep your answer under {max_length} characters"
    
    prompt = f"""You are helping fill out a job application form. Answer the following question based ONLY on the provided context from the applicant's resume and documents.

Context from Resume/Documents:
{context_text}

Question: {question}

Instructions:
- Answer professionally and concisely
- Base your answer ONLY on information from the context above
- Do not make up or hallucinate information
- If the context doesn't contain relevant information, say "Information not available in documents"{length_instruction}
- Write in first person (I, my, etc.)
- Do not include any preamble or explanation, just the answer

Answer:"""
    
    return prompt


def _create_selection_prompt(
    question: str,
    context: List[str],
    options: List[str]
) -> str:
    """Create prompt for select/dropdown/radio fields."""
    
    context_text = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
    options_text = "\n".join([f"- {opt}" for opt in options])
    
    prompt = f"""You are helping fill out a job application form. Select the MOST appropriate option from the list based on the provided context.

Context from Resume/Documents:
{context_text}

Question: {question}

Available Options:
{options_text}

Instructions:
- Choose the SINGLE best option that matches the context
- Return ONLY the exact text of the option, nothing else
- If no option is a good match, choose the closest one
- Do not add any explanation or preamble

Selected Option:"""
    
    return prompt


def _create_boolean_prompt(
    question: str,
    context: List[str]
) -> str:
    """Create prompt for yes/no/checkbox fields."""
    
    context_text = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
    
    prompt = f"""You are helping fill out a job application form. Answer the yes/no question based on the provided context.

Context from Resume/Documents:
{context_text}

Question: {question}

Instructions:
- Answer with ONLY "Yes" or "No"
- Base your answer on the context provided
- If uncertain, answer "No"
- Do not add any explanation

Answer (Yes/No):"""
    
    return prompt


def _create_date_prompt(
    question: str,
    context: List[str]
) -> str:
    """Create prompt for date fields."""
    
    context_text = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
    
    prompt = f"""You are helping fill out a job application form. Extract the relevant date from the context.

Context from Resume/Documents:
{context_text}

Question: {question}

Instructions:
- Extract the date in MM/YYYY or MM/DD/YYYY format
- Return ONLY the date, nothing else
- If no relevant date is found, return "N/A"
- Do not add any explanation

Date:"""
    
    return prompt


def _create_number_prompt(
    question: str,
    context: List[str]
) -> str:
    """Create prompt for number fields."""
    
    context_text = "\n\n".join([f"Context {i+1}:\n{ctx}" for i, ctx in enumerate(context)])
    
    prompt = f"""You are helping fill out a job application form. Extract the relevant number from the context.

Context from Resume/Documents:
{context_text}

Question: {question}

Instructions:
- Return ONLY the number (no units, no text)
- If no relevant number is found, return "0"
- Do not add any explanation

Number:"""
    
    return prompt


def create_prompt_with_examples(
    question: str,
    context: List[str],
    similar_qa_pairs: List[dict],
    field_type: str = "text"
) -> str:
    """
    Create prompt with few-shot examples from answer history.
    
    Args:
        question: The question to answer
        context: List of relevant context strings
        similar_qa_pairs: List of similar question-answer pairs
        field_type: Type of field
        
    Returns:
        Formatted prompt with examples
    """
    base_prompt = create_prompt(question, context, field_type)
    
    if not similar_qa_pairs:
        return base_prompt
    
    # Add examples section
    examples_text = "\n\nPrevious Similar Questions (for reference):\n"
    for i, qa in enumerate(similar_qa_pairs[:3], 1):  # Use top 3 examples
        examples_text += f"\nExample {i}:\n"
        examples_text += f"Q: {qa['question']}\n"
        examples_text += f"A: {qa['answer']}\n"
    
    # Insert examples before the main question
    parts = base_prompt.split("Question:")
    if len(parts) == 2:
        return parts[0] + examples_text + "\nQuestion:" + parts[1]
    
    return base_prompt

