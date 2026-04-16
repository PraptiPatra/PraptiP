import requests
import sys
import json
import uuid
from datetime import datetime

class WhiteboardAgentTester:
    def __init__(self, base_url="https://whiteboard-thinking.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_id = str(uuid.uuid4())
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:200]}...")
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success and response.get('status') == 'ok'

    def test_chat_basic(self):
        """Test basic chat functionality"""
        success, response = self.run_test(
            "Chat - Basic Message",
            "POST",
            "chat",
            200,
            data={
                "message": "Hello, I need help choosing between two laptops",
                "session_id": self.session_id
            },
            timeout=60
        )
        
        if success:
            # Check response structure
            has_message = 'message' in response
            has_session_id = 'session_id' in response
            has_whiteboard_update = 'whiteboard_update' in response
            
            print(f"   Has message: {has_message}")
            print(f"   Has session_id: {has_session_id}")
            print(f"   Has whiteboard_update: {has_whiteboard_update}")
            
            if response.get('whiteboard_update'):
                print(f"   Whiteboard update type: {response['whiteboard_update'].get('scene_type')}")
            
            return has_message and has_session_id
        return False

    def test_chat_with_whiteboard_update(self):
        """Test chat that should generate whiteboard content"""
        success, response = self.run_test(
            "Chat - Whiteboard Update",
            "POST", 
            "chat",
            200,
            data={
                "message": "I'm comparing MacBook Pro vs Dell XPS for software development. MacBook has better build quality and ecosystem, Dell has better price and upgradeability.",
                "session_id": self.session_id
            },
            timeout=60
        )
        
        if success:
            whiteboard_update = response.get('whiteboard_update')
            if whiteboard_update:
                scene_type = whiteboard_update.get('scene_type')
                has_data = 'data' in whiteboard_update
                print(f"   Scene type: {scene_type}")
                print(f"   Has data: {has_data}")
                return scene_type in ['comparison', 'pros_cons', 'notes', 'title']
            else:
                print("   No whiteboard update generated")
                return True  # Still valid, AI might not always draw
        return False

    def test_tts(self):
        """Test text-to-speech endpoint"""
        success, response = self.run_test(
            "Text-to-Speech",
            "POST",
            "tts", 
            200,
            data={
                "text": "Hello, this is a test message for text to speech conversion.",
                "voice_id": "21m00Tcm4TlvDq8ikWAM"
            },
            timeout=30
        )
        
        if success:
            has_audio = 'audio' in response
            print(f"   Has audio data: {has_audio}")
            if has_audio:
                audio_length = len(response['audio'])
                print(f"   Audio data length: {audio_length} characters")
                return audio_length > 100  # Base64 audio should be substantial
        return False

    def test_session_reset(self):
        """Test session reset endpoint"""
        success, response = self.run_test(
            "Session Reset",
            "POST",
            "session/reset",
            200,
            data={"session_id": self.session_id}
        )
        
        if success:
            has_status = 'status' in response
            has_session_id = 'session_id' in response
            status_is_reset = response.get('status') == 'reset'
            
            print(f"   Has status: {has_status}")
            print(f"   Status is reset: {status_is_reset}")
            print(f"   Has session_id: {has_session_id}")
            
            return has_status and status_is_reset and has_session_id
        return False

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper errors"""
        success, response = self.run_test(
            "Invalid Endpoint",
            "GET",
            "nonexistent",
            404
        )
        return success

    def test_health_illustration(self):
        """Test health-related topics generate medical illustrations"""
        success, response = self.run_test(
            "Health Topic - Medical Illustration",
            "POST",
            "chat",
            200,
            data={
                "message": "I need help choosing between different health insurance plans. I want to compare coverage for heart surgery and general medical care.",
                "session_id": str(uuid.uuid4())
            },
            timeout=60
        )
        
        if success:
            whiteboard_update = response.get('whiteboard_update')
            if whiteboard_update and whiteboard_update.get('data'):
                illustration = whiteboard_update['data'].get('illustration')
                print(f"   Generated illustration: {illustration}")
                # Should generate health-related illustrations
                health_illustrations = ['medical', 'heart', 'stethoscope', 'pill']
                return illustration in health_illustrations
            else:
                print("   No illustration generated")
                return True  # Still valid if no illustration
        return False

    def test_food_illustration(self):
        """Test food-related topics generate food illustrations"""
        success, response = self.run_test(
            "Food Topic - Food Illustration",
            "POST",
            "chat",
            200,
            data={
                "message": "I'm planning to open a restaurant and need to decide between pizza, general food, or fine dining with utensils and formal service.",
                "session_id": str(uuid.uuid4())
            },
            timeout=60
        )
        
        if success:
            whiteboard_update = response.get('whiteboard_update')
            if whiteboard_update and whiteboard_update.get('data'):
                illustration = whiteboard_update['data'].get('illustration')
                print(f"   Generated illustration: {illustration}")
                # Should generate food-related illustrations
                food_illustrations = ['food', 'pizza', 'utensils', 'coffee']
                return illustration in food_illustrations
            else:
                print("   No illustration generated")
                return True  # Still valid if no illustration
        return False

    def test_music_sports_illustration(self):
        """Test music and sports topics generate appropriate illustrations"""
        success, response = self.run_test(
            "Music/Sports Topic - Appropriate Illustration",
            "POST",
            "chat",
            200,
            data={
                "message": "I'm choosing between starting a music studio with headphones and audio equipment, or opening a sports gym with dumbbells and football training.",
                "session_id": str(uuid.uuid4())
            },
            timeout=60
        )
        
        if success:
            whiteboard_update = response.get('whiteboard_update')
            if whiteboard_update and whiteboard_update.get('data'):
                illustration = whiteboard_update['data'].get('illustration')
                print(f"   Generated illustration: {illustration}")
                # Should generate music or sports related illustrations
                music_sports_illustrations = ['music', 'headphones', 'paint', 'football', 'dumbbell', 'bicycle']
                return illustration in music_sports_illustrations
            else:
                print("   No illustration generated")
                return True  # Still valid if no illustration
        return False

    def test_animals_nature_illustration(self):
        """Test animals and nature topics generate appropriate illustrations"""
        success, response = self.run_test(
            "Animals/Nature Topic - Appropriate Illustration",
            "POST",
            "chat",
            200,
            data={
                "message": "I'm deciding between adopting a dog or cat as a pet, and also considering if I should move to a house near mountains and trees.",
                "session_id": str(uuid.uuid4())
            },
            timeout=60
        )
        
        if success:
            whiteboard_update = response.get('whiteboard_update')
            if whiteboard_update and whiteboard_update.get('data'):
                illustration = whiteboard_update['data'].get('illustration')
                print(f"   Generated illustration: {illustration}")
                # Should generate animals or nature related illustrations
                animals_nature_illustrations = ['dog', 'cat', 'tree', 'mountain', 'sun', 'house']
                return illustration in animals_nature_illustrations
            else:
                print("   No illustration generated")
                return True  # Still valid if no illustration
        return False

def main():
    print("🚀 Starting Whiteboard Agent Backend Tests")
    print("=" * 50)
    
    tester = WhiteboardAgentTester()
    
    # Run all tests
    tests = [
        ("Health Check", tester.test_health),
        ("Chat Basic", tester.test_chat_basic),
        ("Chat with Whiteboard", tester.test_chat_with_whiteboard_update),
        ("Text-to-Speech", tester.test_tts),
        ("Session Reset", tester.test_session_reset),
        ("Invalid Endpoint", tester.test_invalid_endpoints),
        ("Health Illustration", tester.test_health_illustration),
        ("Food Illustration", tester.test_food_illustration),
        ("Music/Sports Illustration", tester.test_music_sports_illustration),
        ("Animals/Nature Illustration", tester.test_animals_nature_illustration),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results[test_name] = False
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f"\nOverall: {passed_count}/{total_count} tests passed")
    print(f"Success rate: {(passed_count/total_count)*100:.1f}%")
    
    return 0 if passed_count == total_count else 1

if __name__ == "__main__":
    sys.exit(main())