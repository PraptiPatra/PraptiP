import requests
import sys
import json
from datetime import datetime

class WhiteboardAPITester:
    def __init__(self, base_url="https://talk-draw-learn.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:200]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test GET /api/ endpoint"""
        success, response = self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200
        )
        return success and response.get('message') == "Whiteboard Assistant API"

    def test_create_session(self):
        """Test POST /api/sessions endpoint"""
        success, response = self.run_test(
            "Create session",
            "POST",
            "sessions",
            200,
            data={"name": "Test Session"}
        )
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"   Created session ID: {self.session_id}")
            return True
        return False

    def test_get_session(self):
        """Test GET /api/sessions/{id} endpoint"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get session",
            "GET",
            f"sessions/{self.session_id}",
            200
        )
        return success and response.get('id') == self.session_id

    def test_process_transcript(self):
        """Test POST /api/process-transcript endpoint"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False

        test_transcript = "Let's discuss machine learning algorithms. Neural networks are powerful tools for pattern recognition. We should also consider decision trees for interpretability."
        
        success, response = self.run_test(
            "Process transcript",
            "POST",
            "process-transcript",
            200,
            data={
                "transcript": test_transcript,
                "session_id": self.session_id,
                "existing_topics": []
            },
            timeout=60  # LLM processing may take longer
        )
        
        if success:
            # Check if response has expected structure
            has_nodes = 'nodes' in response and isinstance(response['nodes'], list)
            has_connections = 'connections' in response and isinstance(response['connections'], list)
            has_cleaned_transcript = 'cleaned_transcript' in response and isinstance(response['cleaned_transcript'], str)
            has_voice_response = 'voice_response' in response and isinstance(response['voice_response'], str)
            
            if has_nodes and has_connections and has_cleaned_transcript and has_voice_response:
                print(f"   Generated {len(response['nodes'])} nodes and {len(response['connections'])} connections")
                print(f"   Cleaned transcript: {response['cleaned_transcript'][:100]}...")
                print(f"   Voice response: {response['voice_response'][:100]}...")
                return True
            else:
                print(f"❌ Invalid response structure. Missing fields:")
                if not has_nodes: print("   - nodes field missing or invalid")
                if not has_connections: print("   - connections field missing or invalid") 
                if not has_cleaned_transcript: print("   - cleaned_transcript field missing or invalid")
                if not has_voice_response: print("   - voice_response field missing or invalid")
                print(f"   Response: {response}")
                return False
        return False

    def test_get_config(self):
        """Test GET /api/config endpoint"""
        success, response = self.run_test(
            "Get config",
            "GET",
            "config",
            200
        )
        return success and 'elevenlabs_agent_id' in response

    def test_clear_session_nodes(self):
        """Test DELETE /api/sessions/{id}/nodes endpoint"""
        if not self.session_id:
            print("❌ No session ID available for testing")
            return False
            
        success, response = self.run_test(
            "Clear session nodes",
            "DELETE",
            f"sessions/{self.session_id}/nodes",
            200
        )
        return success and response.get('status') == 'cleared'

def main():
    print("🚀 Starting Whiteboard Assistant API Tests")
    print("=" * 50)
    
    tester = WhiteboardAPITester()
    
    # Test sequence
    tests = [
        ("Root endpoint", tester.test_root_endpoint),
        ("Get config", tester.test_get_config),
        ("Create session", tester.test_create_session),
        ("Get session", tester.test_get_session),
        ("Process transcript", tester.test_process_transcript),
        ("Clear session nodes", tester.test_clear_session_nodes),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                print(f"\n⚠️  Test '{test_name}' failed - continuing with remaining tests")
        except Exception as e:
            print(f"\n💥 Test '{test_name}' crashed: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())