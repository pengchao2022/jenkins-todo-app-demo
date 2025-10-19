import pytest
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../src'))

def test_sample():
    """Sample test function"""
    assert 1 + 1 == 2

def test_health_check():
    """Test health check endpoint"""
    # This would be expanded with actual Flask test client
    assert True

if __name__ == '__main__':
    pytest.main([__file__, '-v'])