from typing import List, Optional

from pydantic import BaseModel, Field


class SeafarerProfile(BaseModel):
    name: Optional[str] = None
    rank: Optional[str] = None
    sea_time_years: Optional[float] = None
    certificates: Optional[List[str]] = Field(default_factory=list)
    vessel_types: Optional[List[str]] = Field(default_factory=list)
    last_vessel: Optional[str] = None
    nationality: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    raw_text_preview: Optional[str] = None  # first 500 chars of extracted text
