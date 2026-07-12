def generate_registration_id(seq: int) -> str:
    """
    Generates a Registration ID from a 0-indexed sequence number.
    Format: A1..A100, B1..B100, ..., Z100, AA1..AA100, AB1..ZZ100, AAA1...
    
    Args:
        seq (int): The sequence number (0, 1, 2, ...).
        
    Returns:
        str: The generated alphanumeric Registration ID.
    """
    if seq < 0:
        raise ValueError("Sequence number must be non-negative")
        
    number_part = (seq % 100) + 1
    letter_index = seq // 100
    
    result = ""
    while letter_index >= 0:
        result = chr((letter_index % 26) + ord('A')) + result
        letter_index = letter_index // 26 - 1
        
    return f"{result}{number_part}"
