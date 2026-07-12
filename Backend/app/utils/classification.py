from app.models.domain import VisitClassification, CLASSIFICATION_SEVERITY

# Deterministic mapping of keywords (output by the AI) to clinical classifications
# The backend controls severity through this table, not the AI.
KEYWORD_TO_CLASSIFICATION: dict[str, VisitClassification] = {
    # 🔴 CRITICAL
    "cardiac arrest": VisitClassification.CRITICAL,
    "suicidal ideation": VisitClassification.CRITICAL,
    "loss of consciousness": VisitClassification.CRITICAL,
    "severe bleeding": VisitClassification.CRITICAL,
    "stroke": VisitClassification.CRITICAL,
    "stroke symptoms": VisitClassification.CRITICAL,
    "accident with major injury": VisitClassification.CRITICAL,
    "heart attack": VisitClassification.CRITICAL,
    "chest pain": VisitClassification.CRITICAL,
    "difficulty breathing": VisitClassification.CRITICAL,
    "seizure": VisitClassification.CRITICAL,
    
    # 🟠 URGENT
    "high fever": VisitClassification.URGENT,
    "fracture": VisitClassification.URGENT,
    "severe pain": VisitClassification.URGENT,
    "acute mental health crisis": VisitClassification.URGENT,
    "broken bone": VisitClassification.URGENT,
    "severe abdominal pain": VisitClassification.URGENT,
    
    # 🟡 SEMI_URGENT
    "diabetic spike": VisitClassification.SEMI_URGENT,
    "asthma": VisitClassification.SEMI_URGENT,
    "mild asthma attack": VisitClassification.SEMI_URGENT,
    "chronic pain spike": VisitClassification.SEMI_URGENT,
    "medication side effects": VisitClassification.SEMI_URGENT,
    
    # 🟢 ROUTINE
    "routine": VisitClassification.ROUTINE,
    "checkup": VisitClassification.ROUTINE,
    "wellness": VisitClassification.ROUTINE,
    "vaccination": VisitClassification.ROUTINE,
    "annual physical": VisitClassification.ROUTINE,
    
    # 🔵 NON_CLINICAL
    "lab results": VisitClassification.NON_CLINICAL,
    "second opinion": VisitClassification.NON_CLINICAL,
    "clarify a doubt": VisitClassification.NON_CLINICAL,
    "referral": VisitClassification.NON_CLINICAL,
    "information": VisitClassification.NON_CLINICAL,
}


def determine_classification_from_keywords(keywords: list[str]) -> VisitClassification:
    """
    Evaluates a list of AI-detected keywords and returns the highest corresponding severity.
    Defaults to NON_CLINICAL if no keywords match.
    """
    highest_severity = VisitClassification.NON_CLINICAL
    current_max_val = CLASSIFICATION_SEVERITY[highest_severity]
    
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower in KEYWORD_TO_CLASSIFICATION:
            classification = KEYWORD_TO_CLASSIFICATION[kw_lower]
            val = CLASSIFICATION_SEVERITY[classification]
            if val > current_max_val:
                current_max_val = val
                highest_severity = classification
                
    return highest_severity


def upgrade_classification(current: VisitClassification, new_detected: VisitClassification) -> VisitClassification:
    """
    Returns the higher severity of the two classifications.
    Ensures classification can only be upgraded (e.g., ROUTINE -> CRITICAL), never downgraded.
    """
    current_val = CLASSIFICATION_SEVERITY[current]
    new_val = CLASSIFICATION_SEVERITY[new_detected]
    return new_detected if new_val > current_val else current
