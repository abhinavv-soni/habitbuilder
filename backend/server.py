from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uvicorn
import os
import logging
from pathlib import Path
from bson.objectid import ObjectId
from bson.errors import InvalidId

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
client = AsyncIOMotorClient(mongo_url)
db = client.habit_tracker

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Habit(BaseModel):
    name: str
    description: str
    frequency: str  # daily, weekly, custom
    notification: bool = False
    created_at: datetime = datetime.now()
    completion_dates: List[str] = []

@app.get("/")
async def root():
    return {"message": "Habit Tracker API"}

@app.post("/habits")
async def create_habit(habit: Habit):
    try:
        habit_dict = habit.dict()
        result = await db.habits.insert_one(habit_dict)
        created_habit = await db.habits.find_one({"_id": result.inserted_id})
        created_habit["_id"] = str(created_habit["_id"])
        return created_habit
    except Exception as e:
        logger.error(f"Error creating habit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating habit: {str(e)}")

@app.get("/habits")
async def get_habits():
    try:
        habits = []
        cursor = db.habits.find()
        async for habit in cursor:
            habit["_id"] = str(habit["_id"])
            habits.append(habit)
        return habits
    except Exception as e:
        logger.error(f"Error fetching habits: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching habits: {str(e)}")

@app.put("/habits/{habit_id}")
async def update_habit(habit_id: str, habit: Habit):
    try:
        try:
            object_id = ObjectId(habit_id)
        except InvalidId:
            logger.error(f"Invalid habit ID format: {habit_id}")
            raise HTTPException(status_code=400, detail="Invalid habit ID format")

        # Check if habit exists
        existing_habit = await db.habits.find_one({"_id": object_id})
        if not existing_habit:
            logger.error(f"Habit not found with ID: {habit_id}")
            raise HTTPException(status_code=404, detail="Habit not found")

        # Update the habit
        update_data = habit.dict(exclude={"created_at"})
        result = await db.habits.update_one(
            {"_id": object_id},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            logger.warning(f"No changes made to habit {habit_id}")
            return {"message": "No changes made"}

        updated_habit = await db.habits.find_one({"_id": object_id})
        updated_habit["_id"] = str(updated_habit["_id"])
        return updated_habit

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating habit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating habit: {str(e)}")

@app.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str):
    try:
        try:
            object_id = ObjectId(habit_id)
        except InvalidId:
            logger.error(f"Invalid habit ID format: {habit_id}")
            raise HTTPException(status_code=400, detail="Invalid habit ID format")

        result = await db.habits.delete_one({"_id": object_id})
        if result.deleted_count == 0:
            logger.error(f"Habit not found with ID: {habit_id}")
            raise HTTPException(status_code=404, detail="Habit not found")

        return {"message": "Habit deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting habit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting habit: {str(e)}")

@app.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str):
    try:
        try:
            object_id = ObjectId(habit_id)
        except InvalidId:
            logger.error(f"Invalid habit ID format: {habit_id}")
            raise HTTPException(status_code=400, detail="Invalid habit ID format")
            
        today = datetime.now().strftime("%Y-%m-%d")
        
        # First check if habit exists
        habit = await db.habits.find_one({"_id": object_id})
        if not habit:
            logger.error(f"Habit not found with ID: {habit_id}")
            raise HTTPException(status_code=404, detail="Habit not found")
            
        # Check if already completed today
        if today in habit.get('completion_dates', []):
            logger.info(f"Habit {habit_id} already completed for {today}")
            return {"message": "Habit already completed for today"}
            
        # Update the habit with completion date
        result = await db.habits.update_one(
            {"_id": object_id},
            {"$addToSet": {"completion_dates": today}}
        )
        
        if result.modified_count == 0:
            logger.warning(f"No changes made to habit {habit_id}")
            return {"message": "No changes made"}
            
        logger.info(f"Successfully completed habit {habit_id} for {today}")
        return {"message": "Habit marked as complete"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error completing habit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error completing habit: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=55125, reload=True)