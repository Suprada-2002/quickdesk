from typing import Dict
from pydantic import BaseModel, ConfigDict


class MetricsResponse(BaseModel):
    total_tickets: int
    status_counts: Dict[str, int]
    category_counts: Dict[str, int]
    priority_counts: Dict[str, int]
    median_resolution_time_minutes: float
    category_override_percentage: float
    total_category_overrides: int

    model_config = ConfigDict(from_attributes=True)
