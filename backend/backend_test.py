import requests
import pytest
from datetime import datetime

BASE_URL = "http://localhost:55125"

class TestHabitAPI:
    def setup_method(self):
        self.test_habit_data = {
            "name": f"Test Habit {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "description": "Test habit description",
            "frequency": "daily",
            "notification": True
        }
        self.created_habit_id = None

    def test_01_create_habit(self):
        response = requests.post(f"{BASE_URL}/habits", json=self.test_habit_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == self.test_habit_data["name"]
        assert data["description"] == self.test_habit_data["description"]
        assert data["frequency"] == self.test_habit_data["frequency"]
        assert data["notification"] == self.test_habit_data["notification"]
        assert "_id" in data
        self.created_habit_id = data["_id"]
        print(f"✅ Created habit with ID: {self.created_habit_id}")

    def test_02_get_habits(self):
        response = requests.get(f"{BASE_URL}/habits")
        assert response.status_code == 200
        habits = response.json()
        assert isinstance(habits, list)
        assert len(habits) > 0
        print(f"✅ Retrieved {len(habits)} habits")

    def test_03_update_habit(self):
        if not self.created_habit_id:
            pytest.skip("No habit created to update")
        
        updated_data = {
            **self.test_habit_data,
            "name": f"Updated Habit {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/habits/{self.created_habit_id}",
            json=updated_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == updated_data["name"]
        assert data["description"] == updated_data["description"]
        print(f"✅ Updated habit: {self.created_habit_id}")

    def test_04_complete_habit(self):
        if not self.created_habit_id:
            pytest.skip("No habit created to complete")
            
        response = requests.post(f"{BASE_URL}/habits/{self.created_habit_id}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Habit marked as complete"
        print(f"✅ Marked habit as complete: {self.created_habit_id}")

    def test_05_delete_habit(self):
        if not self.created_habit_id:
            pytest.skip("No habit created to delete")
            
        response = requests.delete(f"{BASE_URL}/habits/{self.created_habit_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Habit deleted successfully"
        print(f"✅ Deleted habit: {self.created_habit_id}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])