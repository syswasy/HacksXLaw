import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UploadedDocument, UserProfile } from '../types/index';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

if (!API_KEY) {
  console.warn('Missing VITE_GOOGLE_API_KEY');
}

const client = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = client ? client.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

export function isGeminiConfigured(): boolean {
  return !!model;
}

export async function extractDocumentTextWithGemini(
  file: File
): Promise<{ text: string; confidence: number; error?: string }> {
  try {
    if (!model) {
      return { text: '', confidence: 0, error: 'Gemini not configured' };
    }

    if (file.type === 'text/plain') {
      const text = await file.text();
      return { text, confidence: 0.95 };
    }

    const base64 = await fileToBase64(file);
    const mimeType = file.type || 'application/octet-stream';

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: mimeType,
        },
      },
      {
        text: 'Extract all text from this document. Preserve formatting. Return plain text only.',
      },
    ]);

    const extractedText = response.response.text();
    return {
      text: extractedText || '',
      confidence: 0.85,
    };
  } catch (error) {
    console.error('Document extraction error:', error);
    return {
      text: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function categorizeDocumentWithGemini(
  doc: UploadedDocument
): Promise<{
  category: string;
  confidence: number;
  reasoning: string;
}> {
  try {
    if (!model) {
      return { category: 'other', confidence: 0, reasoning: 'Gemini not configured' };
    }

    const categories = [
      'identity', 'migration_status', 'employment', 'finance', 
      'procedures', 'housing', 'family', 'health', 'other'
    ];

    // Correction : On s'assure d'extraire le texte peu importe le nom de la propriété
    const content = doc.extraction_result?.extracted_text || (doc as any).text || '';

    const prompt = `Classify this document into EXACTLY one of these categories: ${categories.join(', ')}.
    
Document Name: ${doc.name}
Document Content: ${content.substring(0, 1000)}

Constraint: You must return valid JSON. The "category" field must be lowercase and match the provided list.`;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1 // Plus bas pour plus de précision sur les catégories
      }
    });

    const result = JSON.parse(response.response.text());
    
    // Correction : Nettoyage de la réponse (minuscules et espaces)
    const sanitizedCategory = result.category?.toLowerCase().trim();

    return {
      category: categories.includes(sanitizedCategory) ? sanitizedCategory : 'other',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('Categorization error:', error);
    return { category: 'other', confidence: 0, reasoning: 'Parsing or API error' };
  }
}

export async function generateActionPlanWithGemini(
  profile: UserProfile,
  documents: UploadedDocument[],
  language: string = 'fr'
): Promise<{
  steps: any[];
  summary: string;
  resources: any[];
}> {
  try {
    if (!model) {
      return { steps: [], summary: 'Gemini not configured', resources: [] };
    }

    const docSummary = documents
      .map(doc => `- ${doc.name} (${doc.category || 'uncategorized'}): ${doc.extraction_result?.extracted_text?.substring(0, 200) || 'N/A'}`)
      .join('\n');

    const langLabel = language === 'fr' ? 'French' : 'English';

    const prompt = `Immigration consultant for Quebec. Generate action plan in ${langLabel}.

Profile:
- Status: ${profile.migration_status || 'Not specified'}
- Country: ${profile.country_of_origin || 'Not specified'}
- Arrival: ${profile.arrival_date || 'Not specified'}
- Family: ${profile.family_status || 'Not specified'}
- Issues: ${Array.isArray(profile.legal_issues) ? profile.legal_issues.join(', ') : 'None'}

Documents:
${docSummary}

Response JSON:
{
  "steps": [
    {
      "order": 1,
      "title": "Action",
      "description": "What to do",
      "deadline_days": 14,
      "resources": ["resource"],
      "contacts": {
        "organization": "Name",
        "phone": "+1-XXX",
        "website": "https://..."
      }
    }
  ],
  "summary": "Plan summary",
  "resources": [
    {
      "name": "Resource",
      "type": "website",
      "url": "https://...",
      "phone": "+1-XXX"
    }
  ]
}`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        steps: [],
        summary: 'Could not generate plan',
        resources: [],
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      steps: result.steps || [],
      summary: result.summary || '',
      resources: result.resources || [],
    };
  } catch (error) {
    console.error('Plan generation error:', error);
    return {
      steps: [],
      summary: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resources: [],
    };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default {
  isGeminiConfigured,
  extractDocumentTextWithGemini,
  categorizeDocumentWithGemini,
  generateActionPlanWithGemini,
};
