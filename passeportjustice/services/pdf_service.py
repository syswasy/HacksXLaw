from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def generate_pdf(result, output_file="outputs/legal_summary.pdf"):
    c = canvas.Canvas(output_file, pagesize=letter)
    width, height = letter
    y = height - 50
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "PasseportJustice - Résumé du dossier")
    y -= 30
    
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Type de dossier: {result.get('case_type', '')}")
    y -= 20
    
    c.drawString(50, y, "Résumé:")
    y -= 20
    summary = result.get("summary_french", "")
    for line in summary.split("\n"):
        c.drawString(60, y, line[:100])
        y -= 15
        if y < 80:
            c.showPage()
            y = height - 50
            
    y -= 10
    c.drawString(50, y, "Éléments manquants:")
    y -= 20
    for item in result.get("missing_items", []):
        c.drawString(60, y, f"- {item}")
        y -= 15
        if y < 80:
            c.showPage()
            y = height - 50
            
    y -= 10
    c.drawString(50, y, "Options:")
    y -= 20
    for path in result.get("paths", []):
        text = f"- {path['label']} ({path['risk_level']}): {path['consequence']}"
        c.drawString(60, y, text[:110])
        y -= 15
        if y < 80:
            c.showPage()
            y = height - 50
            
    c.save()
    return output_file