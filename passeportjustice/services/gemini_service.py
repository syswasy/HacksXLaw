import os
import json
from dotenv import load_dotenv
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from utils.prompts import SYSTEM_PROMPT

load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "northamerica-northeast1")

# On vérifie que les variables d'environnement sont chargées
if PROJECT_ID:
    vertexai.init(project=PROJECT_ID, location=LOCATION)

def analyze_case(user_text, uploaded_files=None):
    model = GenerativeModel("gemini-1.5-pro")
    
    prompt = f"""{SYSTEM_PROMPT}
    
Récit utilisateur :
{user_text}

Important :
- Base-toi uniquement sur les informations fournies.
- Si une information manque, indique-le dans "missing_items".
- Retourne uniquement du JSON valide."""

    contents = [prompt]
    
    if uploaded_files:
        for file in uploaded_files:
            file_bytes = file.read()
            mime_type = getattr(file, "type", "application/octet-stream")
            contents.append(Part.from_data(data=file_bytes, mime_type=mime_type))
            
    response = model.generate_content(contents)
    raw_text = response.text.strip()
    
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()
        
    return json.loads(raw_text)