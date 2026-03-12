# Maritime vocabulary constants for Sorch AI
# Used by the AI agent for recognition, scoring, and CV parsing

SEAFARER_RANKS = [
    # Deck Department
    "Master",
    "Chief Officer",
    "Second Officer",
    "Third Officer",
    "Deck Cadet",
    # Engine Department
    "Chief Engineer",
    "Second Engineer",
    "Third Engineer",
    "Fourth Engineer",
    "Engine Cadet",
    "Electrician",
    "Motorman",
    "Oiler",
    "Wiper",
    # Ratings
    "Able Seaman",
    "Ordinary Seaman",
    "Bosun",
    "Fitter",
    "Cook",
    "Steward",
]

VESSEL_TYPES = [
    "Bulk Carrier",
    "Oil Tanker",
    "Chemical Tanker",
    "LNG Carrier",
    "LPG Carrier",
    "Container Ship",
    "General Cargo",
    "Offshore Supply Vessel",
    "AHTS",
    "PSV",
    "Ro-Ro",
    "Passenger",
    "Cruise",
    "Dredger",
    "Tug",
    "Barge",
]

REQUIRED_CERTIFICATES = {
    "COC": "Certificate of Competency",
    "CDC": "Continuous Discharge Certificate",
    "STCW": "Standards of Training, Certification and Watchkeeping",
    "BOSIET": "Basic Offshore Safety Induction and Emergency Training",
    "HUET": "Helicopter Underwater Escape Training",
    "EFA": "Elementary First Aid",
    "PSSR": "Personal Safety and Social Responsibilities",
    "PST": "Personal Survival Techniques",
    "FPFF": "Fire Prevention and Fire Fighting",
    "AFF": "Advanced Fire Fighting",
    "MEFA": "Medical First Aid",
    "MECA": "Medical Care",
    "GMDSS": "Global Maritime Distress and Safety System",
    "SSO": "Ship Security Officer",
    "PDSD": "Proficiency in Designated Security Duties",
}

# Common Hindi/Hinglish maritime terms mapped to English equivalents
MARITIME_HINDI_TERMS = {
    "joining": "joining date",
    "fresher": "no sea experience / entry level",
    "experienced": "has sea time",
    "contract": "contract duration",
    "relief": "replacement posting",
    "vessel": "ship / vessel",
    "company": "shipping company",
    "rank": "position / rank",
    "certificate": "certificate / document",
    "available": "available for joining",
    "salary": "expected salary / CTC",
    "sea time": "total sea experience",
    "last vessel": "most recent ship",
    "flag": "ship flag state",
    "port": "port of joining",
    "sign off": "end of contract",
    "sign on": "start of contract",
}

# Scoring weights for candidate evaluation
SCORING_WEIGHTS = {
    "availability": 0.25,
    "rank_match": 0.25,
    "certificates": 0.30,
    "vessel_preference": 0.10,
    "communication": 0.10,
}

# Availability scoring thresholds (days)
AVAILABILITY_SCORE = {
    "immediate": (0, 7, 25),      # (min_days, max_days, score)
    "short_notice": (8, 30, 20),
    "medium_notice": (31, 60, 10),
    "long_notice": (61, 999, 0),
}
