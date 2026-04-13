from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import math
import os

app = FastAPI(title="Smart Stadium ML Service",
              description="Predictive Wait-Time Engine for Crowd Management",
              version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ZoneData(BaseModel):
    zone_id: str
    current_density: float # percentage 0 to 100
    capacity: int
    historical_throughput: Optional[float] = 10.0 # people per minute

class WaitTimePrediction(BaseModel):
    zone_id: str
    predicted_wait_time_minutes: int
    crowd_level: str # 'Low', 'Moderate', 'High', 'Severe'

@app.get("/")
def read_root():
    return {"status": "ML Service is running"}

@app.post("/predict", response_model=WaitTimePrediction)
def predict_wait_time(data: ZoneData):
    if data.current_density < 0 or data.current_density > 100:
        raise HTTPException(status_code=400, detail="Density must be between 0 and 100")
    
    # Simple predictive heuristic:
    # Number of people = (capacity * density) / 100
    # Wait time = people / throughput
    # Scale non-linearly to simulate bottleneck situations when density is very high!
    
    people_present = (data.capacity * data.current_density) / 100.0
    base_wait_time = people_present / data.historical_throughput
    
    # Introduce bottleneck penalty: wait time increases exponentially past 75% density
    if data.current_density > 75:
        penalty_factor = math.exp((data.current_density - 75) / 10.0)
        final_wait_time = int(base_wait_time * penalty_factor)
        crowd_level = 'Severe'
    elif data.current_density > 50:
        final_wait_time = int(base_wait_time * 1.5)
        crowd_level = 'High'
    elif data.current_density > 25:
        final_wait_time = int(base_wait_time * 1.1)
        crowd_level = 'Moderate'
    else:
        final_wait_time = int(base_wait_time)
        crowd_level = 'Low'

    return WaitTimePrediction(
        zone_id=data.zone_id,
        predicted_wait_time_minutes=max(1, final_wait_time),
        crowd_level=crowd_level
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
