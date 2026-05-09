import os
import streamlit as st
from dotenv import load_dotenv

from services.gemini_service import analyze_case
from services.tts_service import generate_speech
from services.pdf_service import generate_pdf

load_dotenv()

os.makedirs("outputs", exist_ok=True)
os.makedirs("temp_uploads", exist_ok=True)

st.set_page_config(page_title="PasseportJustice", layout="wide")

st.title("PasseportJustice")
st.subheader("La boussole juridique vocale pour personnes immigrantes et non représentées")

st.info("Information juridique générale seulement. Ceci ne remplace pas un avocat.")

language = st.selectbox(
    "Choisissez une langue / Choose a language",
    ["Français", "English", "Español", "العربية"]
)

consent = st.checkbox(
    "J'accepte le traitement temporaire de mes données pour générer un résumé juridique."
)

user_text = st.text_area(
    "Expliquez votre problème / Describe your problem",
    placeholder="Ex. Mon employeur ne m'a pas payé depuis 2 semaines..."
)

uploaded_files = st.file_uploader(
    "Téléversez vos documents (images, PDF)",
    type=["png", "jpg", "jpeg", "pdf"],
    accept_multiple_files=True
)

if st.button("Analyser mon dossier"):
    if not consent:
        st.error("Vous devez accepter le traitement temporaire des données.")
    elif not user_text and not uploaded_files:
        st.error("Veuillez fournir un récit ou des documents.")
    else:
        with st.spinner("Analyse en cours..."):
            try:
                result = analyze_case(
                    user_text=user_text,
                    uploaded_files=uploaded_files
                )

                st.success("Analyse terminée")

                st.markdown("## Type de problème")
                st.write(result.get("case_type", ""))

                st.markdown("## Résumé")
                st.write(result.get("summary_french", ""))

                st.markdown("## 3 options")
                for path in result.get("paths", []):
                    st.write(f"**{path['label']}** - Risque: {path['risk_level']}")
                    st.write(path["consequence"])
                    st.write("---")

                st.markdown("## Chronologie")
                for event in result.get("timeline", []):
                    st.write(f"**{event['date']}** - {event['event']}")
                    if event.get("evidence"):
                        st.caption("Preuves: " + ", ".join(event["evidence"]))

                st.markdown("## Éléments manquants")
                for item in result.get("missing_items", []):
                    st.write(f"- {item}")

                st.markdown("## Données de formulaire")
                st.json(result.get("form_data", {}))

                summary_text = result.get("summary_french", "")
                if summary_text:
                    audio_path = generate_speech(summary_text)
                    st.markdown("## Lecture audio")
                    st.audio(audio_path)

                pdf_path = generate_pdf(result)
                with open(pdf_path, "rb") as pdf_file:
                    st.download_button(
                        label="Télécharger le résumé PDF",
                        data=pdf_file,
                        file_name="resume_dossier.pdf",
                        mime="application/pdf"
                    )

            except Exception as e:
                st.error(f"Erreur pendant l'analyse : {str(e)}")