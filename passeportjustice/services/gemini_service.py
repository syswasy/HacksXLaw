import os
import json
from dotenv import load_dotenv
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from utils.prompts import SYSTEM_PROMPT

# Chargement des variables d'environnement
load_dotenv()

PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "northamerica-northeast1")

# Initialisation de Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

def analyze_case(user_text, uploaded_files=None):
    """
    Analyse un cas juridique en utilisant le texte de l'utilisateur 
    et les fichiers téléchargés via Gemini 1.5 Pro.
    """
    model = GenerativeModel("gemini-1.5-pro")
    
    txt_contents = []
    contents = []

    # Gestion des fichiers téléchargés
    if uploaded_files:
        for file in uploaded_files:
            file_name = getattr(file, "name", "unknown_file")
            mime_type = getattr(file, "type", "application/octet-stream")

            if file_name.lower().endswith(".txt"):
                # Traitement spécifique pour les fichiers texte
                file_bytes = file.read()
                try:
                    text_content = file_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    text_content = file_bytes.decode("latin-1", errors="ignore")
                
                txt_contents.append(f"\n--- Contenu du fichier TXT: {file_name} ---\n{text_content}\n")
            else:
                # Pour les PDF ou Images (passés comme fichiers multimédias)
                file_bytes = file.read()
                contents.append(
                    Part.from_data(data=file_bytes, mime_type=mime_type)
                )

    combined_txt = "\n".join(txt_contents)

    # Construction du prompt final
    prompt = f"""
{SYSTEM_PROMPT}

Récit utilisateur :
{user_text}

Contenu des fichiers texte :
{combined_txt}

Important :
- Base-toi uniquement sur les informations fournies.
- Si une information manque, indique-le dans "missing_items".
- Si des fichiers texte juridiques sont fournis, utilise-les comme contexte documentaire.
- Retourne uniquement du JSON valide.
"""

    # Fusion du prompt et des fichiers multimédias (multimodal)
    final_contents = [prompt] + contents

    # Appel au modèle
    response = model.generate_content(final_contents)
    raw_text = response.text.strip()

    # Nettoyage du bloc de code JSON si présent
    if raw_text.startswith("```"):
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"Erreur de décodage JSON : {e}")
        return {"error": "L'IA n'a pas retourné un format valide."}