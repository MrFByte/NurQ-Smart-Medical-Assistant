import pytest
from app.utils.registration import generate_registration_id

def test_generate_registration_id():
    # Basic cases A1 to A100
    assert generate_registration_id(0) == "A1"
    assert generate_registration_id(9) == "A10"
    assert generate_registration_id(99) == "A100"
    
    # B1 to B100
    assert generate_registration_id(100) == "B1"
    assert generate_registration_id(199) == "B100"
    
    # Z100
    assert generate_registration_id(2599) == "Z100"
    
    # AA1 to AA100
    assert generate_registration_id(2600) == "AA1"
    assert generate_registration_id(2699) == "AA100"
    
    # AZ100
    assert generate_registration_id(5199) == "AZ100"
    
    # BA1
    assert generate_registration_id(5200) == "BA1"
    
    # ZZ100
    assert generate_registration_id(70199) == "ZZ100"
    
    # AAA1
    assert generate_registration_id(70200) == "AAA1"

def test_generate_registration_id_negative():
    with pytest.raises(ValueError):
        generate_registration_id(-1)
