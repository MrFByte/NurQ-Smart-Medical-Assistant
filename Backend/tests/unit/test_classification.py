import pytest
from app.models.domain import VisitClassification
from app.utils.classification import determine_classification_from_keywords, upgrade_classification

def test_determine_classification():
    # CRITICAL triggers
    assert determine_classification_from_keywords(["cardiac arrest"]) == VisitClassification.CRITICAL
    assert determine_classification_from_keywords(["mild headache", "chest pain"]) == VisitClassification.CRITICAL
    
    # URGENT triggers
    assert determine_classification_from_keywords(["high fever"]) == VisitClassification.URGENT
    
    # SEMI_URGENT triggers
    assert determine_classification_from_keywords(["asthma"]) == VisitClassification.SEMI_URGENT
    # NON_CLINICAL / default
    assert determine_classification_from_keywords(["wellness"]) == VisitClassification.ROUTINE
    assert determine_classification_from_keywords([]) == VisitClassification.NON_CLINICAL
    assert determine_classification_from_keywords(["something random"]) == VisitClassification.NON_CLINICAL
    
    # NON_CLINICAL explicit
    assert determine_classification_from_keywords(["lab results"]) == VisitClassification.NON_CLINICAL

def test_upgrade_classification():
    # Can upgrade
    assert upgrade_classification(VisitClassification.ROUTINE, VisitClassification.URGENT) == VisitClassification.URGENT
    assert upgrade_classification(VisitClassification.SEMI_URGENT, VisitClassification.CRITICAL) == VisitClassification.CRITICAL
    
    # Cannot downgrade
    assert upgrade_classification(VisitClassification.CRITICAL, VisitClassification.ROUTINE) == VisitClassification.CRITICAL
    assert upgrade_classification(VisitClassification.URGENT, VisitClassification.SEMI_URGENT) == VisitClassification.URGENT
    
    # Same level
    assert upgrade_classification(VisitClassification.ROUTINE, VisitClassification.ROUTINE) == VisitClassification.ROUTINE
