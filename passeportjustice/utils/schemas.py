from pydantic import BaseModel
from typing import List, Dict, Any

class LegalFact(BaseModel):
    date: str
    fact: str
    evidence: List[str]

class PathOption(BaseModel):
    label: str
    risk_level: str
    consequence: str

class TimelineEvent(BaseModel):
    date: str
    event: str
    evidence: List[str]

class AnalysisResult(BaseModel):
    case_type: str
    summary_user_language: str
    summary_french: str
    legal_facts: List[LegalFact]
    paths: List[PathOption]
    timeline: List[TimelineEvent]
    missing_items: List[str]
    form_data: Dict[str, Any]