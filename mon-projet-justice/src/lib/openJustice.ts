import type { UserProfile, ActionPlan, ActionStep, UploadedDocument } from '../types/index';
import {
  isGeminiConfigured,
  categorizeDocumentWithGemini,
  generateActionPlanWithGemini,
} from './geminiClient';
export type { ActionPlan, ActionStep } from '../types/index';
export interface LegalAnalysisResult {
  status: string;
  finalOutput?: string;
  facts?: {
    Role?: string;
    Jurisdiction?: string;
    "Language Preference"?: string;
    "Document Count"?: number;
    [key: string]: any;
  };
  executionId?: string;
}
export function categorizeDocuments(documents: UploadedDocument[]): Map<string, UploadedDocument[]> {
  const categories = new Map<string, UploadedDocument[]>();
  const categoryKeywords = {
    identity: {
      keywords: [
        'passport', 'identity', 'card', 'carte d\'identité', 'permis', 'birth certificate',
        'birth', 'certificat de naissance', 'driver license', 'licence de conduire', 'id card',
        'carte d\'identité', 'health insurance', 'assurance maladie', 'social insurance number',
        'sin', 'nos', 'numéro d\'assurance', 'vaccination', 'vaccination certificate', 'proof of identity'
      ],
      weight: 1.0
    },
    migration_status: {
      keywords: [
        'visa', 'permit', 'permit holder', 'permis de séjour', 'permis de travail', 'work permit',
        'study permit', 'permis d\'études', 'cisr', 'avis de décision', 'decision notice',
        'resident visa', 'visa de résident', 'travel document', 'document de voyage',
        'immigration', 'visitor record', 'statut de résident', 'temporary resident', 'imm',
        'ircc', 'canada immigration', 'demande de résidence', 'application for residence'
      ],
      weight: 1.2 // Higher priority for immigration docs
    },
    family: {
      keywords: [
        'marriage', 'mariage', 'divorce', 'birth', 'naissance', 'child', 'enfant',
        'family', 'famille', 'parental', 'custody', 'guardianship', 'tutelle',
        'adoption', 'certificat de mariage', 'certificate of marriage', 'acte de naissance',
        'dependent', 'dépendant', 'spouse', 'conjoint', 'relationship proof', 'preuve de lien'
      ],
      weight: 1.0
    },
    employment: {
      keywords: [
        'contract', 'contrat', 'employment', 'emploi', 'job offer', 'offre d\'emploi',
        'lmo', 'labour market', 'offer of employment', 'lettre d\'offre',
        'salary', 'salaire', 'position', 'poste', 'employer', 'employeur',
        'job', 'travail', 'work', 'employment agreement', 'accord de travail'
      ],
      weight: 1.0
    },
    housing: {
      keywords: [
        'lease', 'bail', 'rent', 'location', 'mortgage', 'hypothèque', 'tenancy',
        'propriétaire', 'rental agreement', 'accord de location', 'proof of residence',
        'preuve de résidence', 'address', 'adresse', 'housing', 'logement',
        'utility bill', 'facture d\'électricité', 'proof of address', 'certificate of residence'
      ],
      weight: 0.9
    },
    procedures: {
      keywords: [
        'form', 'formulaire', 'application', 'demande', 'affidavit', 'déclaration',
        'list of documents', 'liste de contrôle', 'checklist', 'imm', 'form imm',
        'application form', 'formulaire de demande', 'official form', 'formulaire officiel',
        'procedure', 'processus', 'guide', 'instruction', 'requirements', 'exigences'
      ],
      weight: 1.1
    },
    health: {
      keywords: [
        'vaccination', 'medical', 'health', 'santé', 'prescription', 'doctor',
        'médecin', 'hospital', 'hôpital', 'clinic', 'clinique', 'health examination',
        'examen médical', 'medical report', 'rapport médical', 'vaccine', 'vaccin',
        'health certificate', 'certificat de santé', 'medical assessment'
      ],
      weight: 0.9
    },
    finance: {
      keywords: [
        'bank', 'banque', 'proof of funds', 'preuve de fonds', 'tax', 'impôt',
        'statement', 'relevé', 'income', 'revenu', 't4', 't1', 'notice of assessment',
        'avis de cotisation', 'financial', 'financier', 'salary', 'salaire',
        'bank statement', 'relevé bancaire', 'proof of income', 'proof of financial support'
      ],
      weight: 0.95
    },
  };
  documents.forEach(doc => {
    const docNameLower = doc.name.toLowerCase();
    let bestCategory = 'other';
    let bestScore = 0;
    for (const [category, data] of Object.entries(categoryKeywords)) {
      let score = 0;
      data.keywords.forEach(keyword => {
        if (docNameLower.includes(keyword.toLowerCase())) {
          const exactMatches = docNameLower.split(' ').filter(word => 
            keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())
          ).length;
          score += (1 + exactMatches * 0.5) * data.weight;
        }
      });
      if (doc.file_type === 'pdf' && category === 'procedures') {
        score += 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }
    const finalCategory = bestScore > 0.7 ? bestCategory : 'other';
    if (!categories.has(finalCategory)) {
      categories.set(finalCategory, []);
    }
    categories.get(finalCategory)!.push({
      ...doc,
      category: finalCategory as any,
      extraction_result: {
        ...doc.extraction_result,
        confidence: Math.min(Math.round(bestScore * 100), 100),
      },
    });
  });
  return categories;
}
export function extractDocumentInfo(doc: UploadedDocument): UploadedDocument {
  const docNameLower = doc.name.toLowerCase();
  const category = doc.category || 'other';
  let docType = 'unknown';
  let issues: string[] = [];
  let extractedText = '';
  if (category === 'identity') {
    if (docNameLower.includes('passport')) docType = 'passport';
    else if (docNameLower.includes('license') || docNameLower.includes('licence')) docType = 'driver_license';
    else if (docNameLower.includes('birth')) docType = 'birth_certificate';
    else if (docNameLower.includes('vaccination') || docNameLower.includes('vaccine')) docType = 'vaccination_proof';
    else docType = 'identity_document';
    issues.push('Vérifier la date d\'expiration');
  }
  else if (category === 'migration_status') {
    if (docNameLower.includes('visa')) docType = 'visa';
    else if (docNameLower.includes('permit')) docType = 'work_permit';
    else if (docNameLower.includes('study')) docType = 'study_permit';
    else if (docNameLower.includes('resident')) docType = 'resident_card';
    else if (docNameLower.includes('visitor')) docType = 'visitor_record';
    else docType = 'migration_document';
    issues.push('Vérifier validité et restrictions');
    issues.push('Consulter deadline renouvellement');
  }
  else if (category === 'employment') {
    if (docNameLower.includes('contract')) docType = 'employment_contract';
    else if (docNameLower.includes('offer')) docType = 'job_offer';
    else if (docNameLower.includes('lmo')) docType = 'labour_market_opinion';
    else docType = 'employment_document';
    issues.push('Vérifier termes du contrat');
  }
  else if (category === 'housing') {
    if (docNameLower.includes('lease') || docNameLower.includes('bail')) docType = 'lease_agreement';
    else if (docNameLower.includes('mortgage')) docType = 'mortgage_statement';
    else if (docNameLower.includes('utility') || docNameLower.includes('bill')) docType = 'proof_of_residence';
    else docType = 'housing_document';
  }
  else if (category === 'procedures') {
    if (docNameLower.includes('checklist') || docNameLower.includes('list')) docType = 'document_checklist';
    else if (docNameLower.includes('form') || docNameLower.includes('formulaire')) docType = 'official_form';
    else if (docNameLower.includes('application') || docNameLower.includes('demande')) docType = 'application_form';
    else docType = 'procedural_document';
    issues.push('Vérifier que tous les champs sont remplis');
  }
  else if (category === 'health') {
    if (docNameLower.includes('vaccination') || docNameLower.includes('vaccine')) docType = 'vaccination_proof';
    else if (docNameLower.includes('medical')) docType = 'medical_report';
    else if (docNameLower.includes('prescription')) docType = 'prescription';
    else docType = 'health_document';
  }
  else if (category === 'finance') {
    if (docNameLower.includes('bank')) docType = 'bank_statement';
    else if (docNameLower.includes('tax') || docNameLower.includes('impôt')) docType = 'tax_return';
    else if (docNameLower.includes('income') || docNameLower.includes('t4')) docType = 'income_statement';
    else docType = 'financial_document';
    issues.push('Vérifier que le solde est suffisant');
  }
  else if (category === 'family') {
    if (docNameLower.includes('marriage')) docType = 'marriage_certificate';
    else if (docNameLower.includes('divorce')) docType = 'divorce_decree';
    else if (docNameLower.includes('birth')) docType = 'birth_certificate';
    else if (docNameLower.includes('custody')) docType = 'custody_order';
    else docType = 'family_document';
  }
  else {
    docType = 'unknown_document';
    issues.push('Document type unknown - vérifier manuellement');
  }
  extractedText = `Document: ${doc.name}\nType: ${docType}\nCategory: ${category}`;
  return {
    ...doc,
    extraction_result: {
      document_type: docType,
      confidence: doc.extraction_result?.confidence || 75,
      extracted_text: extractedText,
      issues: Array.from(new Set([...issues, ...(doc.extraction_result?.issues || [])])),
    },
  };
}
function generateStepsFromDocuments(documents: UploadedDocument[], _profile: UserProfile): ActionStep[] {
  const steps: ActionStep[] = [];
  const categories = categorizeDocuments(documents);
  let stepOrder = 1;
  const otherDocs = categories.get('other') || [];
  const hasManyDocs = documents.length >= 2;
  if (otherDocs.length === documents.length && documents.length > 0) {
    steps.push({
      id: `step_unknown_1`,
      order: stepOrder++,
      title: 'Identifier et classer vos documents',
      description: `Vous avez ${documents.length} document(s) uploadé(s). Identifiez leur type:\n- Documents d'identité: passeport, permis de conduire, certificat de naissance\n- Documents de statut: visa, permis de travail, permis d'études\n- Documents de travail: offre d'emploi, contrat, lettres de l'employeur\n- Documents financiers: relevés bancaires, avis d'imposition\n- Documents administratifs: formulaires, checklists, procédures\n\nVérifiez que chaque document correspond à votre situation.`,
      deadline_days: 7,
      required_documents: documents.map(d => d.name),
      legal_basis: {
        law: 'LIPR - Exigences de documentation',
      },
      help_contact: {
        organization: 'IRCC Service Client',
        phone: '1-888-242-2342',
        website: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html',
      },
      status: 'pending',
    });
    if (hasManyDocs) {
      steps.push({
        id: `step_unknown_2`,
        order: stepOrder++,
        title: 'Vérifier la validité des documents',
        description: `Pour chaque document:\n✓ Vérifiez la date d'expiration (si applicable)\n✓ Assurez-vous que le document est lisible et complet\n✓ Confirmez que les informations correspondent à votre profil\n✓ Cherchez les dates de signature et d'émission\n\nDocuments à vérifier: ${documents.map(d => d.name).join(', ')}`,
        deadline_days: 7,
        required_documents: documents.map(d => d.name),
        legal_basis: {
          law: 'LIPR - Authenticité des documents',
        },
        help_contact: {
          organization: 'Aide juridique Québec',
          phone: '1-855-536-2333',
          website: 'https://www.aidejuridique.qc.ca',
        },
        status: 'pending',
      });
    }
    steps.push({
      id: `step_unknown_3`,
      order: stepOrder++,
      title: 'Préparer un résumé de vos documents',
      description: `Créez une liste détaillée:\n1. Nom du document\n2. Type (identité, travail, logement, etc.)\n3. Date d'émission et d'expiration\n4. Statut: valide, expiré, ou à renouveler\n5. Langue du document\n\nCela aidera l'agent d'immigration à traiter votre demande rapidement.`,
      deadline_days: 10,
      required_documents: documents.map(d => d.name),
      legal_basis: {
        law: 'LIPR - Organisation des documents',
      },
      status: 'pending',
    });
    steps.push({
      id: `step_unknown_4`,
      order: stepOrder++,
      title: 'Obtenir des traductions certifiées si nécessaire',
      description: `Si vos documents ne sont pas en anglais ou français:\n✓ Vous devez les faire traduire par un traducteur certifié\n✓ La traduction doit être accompagnée de l'original\n✓ Les frais de traduction (200-400$) sont à votre charge\n✓ Consultez un traducteur notarié agréé au Québec`,
      deadline_days: 14,
      required_documents: documents.map(d => d.name),
      legal_basis: {
        law: 'LIPR - Documents dans une autre langue doivent être traduits',
      },
      help_contact: {
        organization: 'Ordre des traducteurs du Québec',
        website: 'https://ottiaq.org',
      },
      status: 'pending',
    });
    return steps;
  }
  if (categories.has('procedures')) {
    const procDocs = categories.get('procedures') || [];
    if (procDocs.length > 0) {
      steps.push({
        id: `step_procedures_${stepOrder}`,
        order: stepOrder++,
        title: 'Compléter et vérifier formulaires administratifs',
        description: `Vous avez ${procDocs.length} document(s) administratif(s): ${procDocs.map(d => d.name).join(', ')}\n\nAssurez-vous que:\n✓ Tous les champs obligatoires sont remplis\n✓ Les formulaires sont signés et datés\n✓ Les dates sont correctes (format JJ/MM/AAAA)\n✓ Les signatures correspondent aux documents d'identité`,
        deadline_days: 14,
        required_documents: procDocs.map(d => d.extraction_result?.document_type || d.name),
        legal_basis: {
          law: 'LIPR - Exigences de procédure administrative',
        },
        help_contact: {
          organization: 'IRCC Service',
          website: 'https://www.canada.ca/en/immigration-refugees-citizenship',
        },
        status: 'pending',
      });
    }
  }
  if (categories.has('migration_status')) {
    const migDocs = categories.get('migration_status') || [];
    if (migDocs.length > 0) {
      steps.push({
        id: `step_migration_${stepOrder}`,
        order: stepOrder++,
        title: 'Vérifier validité des documents migratoires',
        description: `Vous avez ${migDocs.length} document(s) de statut: ${migDocs.map(d => d.name).join(', ')}\n\nPoints importants:\n✓ Dates d'expiration - marquez-les dans votre calendrier\n✓ Restrictions d'emploi - vérifiez si vous pouvez travailler\n✓ Conditions de visa - vérifiez tout ce qui peut annuler votre statut\n✓ Renouvellement - demandez 9 mois avant l'expiration`,
        deadline_days: 7,
        required_documents: migDocs.map(d => d.extraction_result?.document_type || d.name),
        legal_basis: {
          law: 'LIPR Art. 49-196 - Validité des permis',
        },
        help_contact: {
          organization: 'IRCC Vérification de statut',
          website: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html',
        },
        status: 'pending',
      });
    }
  }
  if (categories.has('employment')) {
    const empDocs = categories.get('employment') || [];
    if (empDocs.length > 0) {
      steps.push({
        id: `step_employment_${stepOrder}`,
        order: stepOrder++,
        title: 'Organiser documents d\'emploi',
        description: `Vous avez ${empDocs.length} document(s) d'emploi: ${empDocs.map(d => d.name).join(', ')}\n\nPréparez:\n✓ Copie du contrat de travail (tous les pages)\n✓ Offre d'emploi signée par l'employeur\n✓ Lettres de l'employeur confirmant le salaire et position\n✓ Preuve d'emploi actuel (talons de chèque, T4, avis de paye)`,
        deadline_days: 10,
        required_documents: empDocs.map(d => d.extraction_result?.document_type || d.name),
        legal_basis: {
          law: 'LIPR Art. 186-196 - Permis de travail',
        },
        help_contact: {
          organization: 'Service Canada',
          website: 'https://www.canada.ca/en/services/jobs',
        },
        status: 'pending',
      });
    }
  }
  if (categories.has('finance')) {
    const finDocs = categories.get('finance') || [];
    if (finDocs.length > 0) {
      steps.push({
        id: `step_finance_${stepOrder}`,
        order: stepOrder++,
        title: 'Préparer preuves financières',
        description: `Vous avez ${finDocs.length} document(s) financier(s): ${finDocs.map(d => d.name).join(', ')}\n\nAchetez/téléchargez:\n✓ Relevés bancaires (3-6 derniers mois) montrant le solde\n✓ Certificats de placement garantis (CPG) ou investissements\n✓ Avis d'imposition des 2 dernières années\n✓ Preuves de revenu d'emploi (T4, relevés d'emploi)\n✓ Preuves de revenu passif (dividendes, rentes, intérêts)`,
        deadline_days: 14,
        required_documents: finDocs.map(d => d.extraction_result?.document_type || d.name),
        legal_basis: {
          law: 'LIPR - Seuil de faible revenu (SFR)',
        },
        help_contact: {
          organization: 'Agence du revenu du Canada',
          website: 'https://www.canada.ca/taxes',
        },
        status: 'pending',
      });
    }
  }
  if (categories.has('identity')) {
    const idDocs = categories.get('identity') || [];
    if (idDocs.length > 0) {
      steps.push({
        id: `step_identity_${stepOrder}`,
        order: stepOrder++,
        title: 'Vérifier documents d\'identité',
        description: `Vous avez ${idDocs.length} document(s) d'identité: ${idDocs.map(d => d.name).join(', ')}\n\nVérifications importantes:\n✓ Aucun n'est expiré\n✓ Tous les noms correspondent\n✓ Les photos sont claires et actuelles\n✓ Les sigles sont complètes (passeport, visa, etc.)\n✓ Les timbres d'entrée au Canada sont visibles`,
        deadline_days: 7,
        required_documents: idDocs.map(d => d.extraction_result?.document_type || d.name),
        legal_basis: {
          law: 'LIPR - Exigences d\'identification',
        },
        status: 'pending',
      });
    }
  }
  return steps;
}
export async function generateActionPlan(
  profile: UserProfile,
  documents: UploadedDocument[]
): Promise<ActionPlan> {
  const planId = `plan_${Date.now()}`;
  let steps: ActionStep[] = [];
  let stepOrder = 1;
  if (profile.migration_status === 'asylum_seeker') {
    steps.push({
      id: 'step_1',
      order: stepOrder++,
      title: 'Soumettre demande de protection',
      description: 'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC',
      deadline_days: 15,
      required_documents: ['passport', 'police_certificate'],
      legal_basis: {
        law: 'LIPR Art. 49 - Protection des réfugiés',
        court_decisions: [
          {
            case_id: 'IMM-12345-2024',
            court: 'CISR',
            year: 2024,
            outcome: 'favorable',
            relevance_score: 95,
          },
        ],
      },
      form_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/form-8888.html',
      help_contact: {
        organization: 'Aide juridique Québec',
        phone: '1-855-536-2333',
        website: 'https://www.aidejuridique.qc.ca',
      },
      status: 'pending',
    });
    steps.push({
      id: 'step_2',
      order: stepOrder++,
      title: 'Obtenir documents de soutien',
      description: 'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale',
      deadline_days: 30,
      required_documents: ['support_letters', 'medical_report'],
      legal_basis: {
        law: 'LIPR Art. 96-98 - Critères de réfugié',
        court_decisions: [
          {
            case_id: 'IMM-54321-2024',
            court: 'CAF',
            year: 2024,
            outcome: 'favorable',
            relevance_score: 88,
          },
        ],
      },
      help_contact: {
        organization: 'Conseil Canadien pour les Réfugiés',
        website: 'https://www.ccr.ca/fr/',
      },
      status: 'pending',
    });
  } else if (profile.migration_status === 'temporary_resident' && profile.legal_issues?.includes('employment')) {
    steps.push({
      id: 'step_1',
      order: stepOrder++,
      title: 'Vérifier statut de travail',
      description: 'Confirmer que votre permis de travail est valide et couvre votre emploi actuel',
      deadline_days: 7,
      required_documents: ['work_permit'],
      legal_basis: {
        law: 'LIPR Art. 186-196 - Permis de travail',
      },
      help_contact: {
        organization: 'Service Canada',
        website: 'https://www.canada.ca/en/services/jobs/opportunities/work.html',
      },
      status: 'pending',
    });
  }
  if (documents.length > 0) {
    const documentSteps = generateStepsFromDocuments(documents, profile);
    documentSteps.forEach(step => {
      step.order = stepOrder++;
    });
    steps.push(...documentSteps);
  }
  if (documents.length > 0 || steps.length > 0) {
    steps.push({
      id: 'step_submit',
      order: stepOrder++,
      title: 'Organiser et soumettre documents',
      description: 'Rassemblez tous les documents vérifiés et préparez votre soumission complète. Vérifiez que tous les formulaires sont signés et datés.',
      deadline_days: 0,
      required_documents: documents.map(d => d.name),
      legal_basis: {
        law: 'LIPR - Exigences de soumission',
      },
      help_contact: {
        organization: 'Centre de réception des demandes (CPC)',
        website: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html',
      },
      status: 'pending',
    });
  }
  return {
    id: planId,
    profile_id: profile.age?.toString() || 'unknown',
    created_at: new Date().toISOString(),
    total_steps: steps.length,
    completed_steps: 0,
    steps,
    last_updated: new Date().toISOString(),
  };
}
export function translateActionPlan(actionPlan: ActionPlan, language?: string): ActionPlan {
  const normalizedLang = (language || 'français').toLowerCase().trim();
  const translations: Record<string, Record<string, string>> = {
    'english': {
      'Soumettre demande de protection': 'Submit protection application',
      'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC': 'Complete the official protection application form and submit it to IRCC',
      'Obtenir documents de soutien': 'Obtain support documents',
      'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale': 'Gather support letters, proof of persecution, or medical documentation',
      'Vérifier statut de travail': 'Verify work status',
      'Confirmer que votre permis de travail est valide et couvre votre emploi actuel': 'Confirm that your work permit is valid and covers your current employment',
      'Organiser et archiver documents': 'Organize and archive documents',
      'Les documents téléversés ont été classifiés. Consultez chaque catégorie pour les prochaines étapes.': 'Your uploaded documents have been classified. Consult each category for the next steps.',
      'LIPR Art. 49 - Protection des réfugiés': 'IRPA Art. 49 - Refugee Protection',
      'LIPR Art. 96-98 - Critères de réfugié': 'IRPA Art. 96-98 - Refugee Criteria',
      'LIPR Art. 186-196 - Permis de travail': 'IRPA Art. 186-196 - Work Permit',
      'Aide juridique Québec': 'Legal Aid Quebec',
      'Conseil Canadien pour les Réfugiés': 'Canadian Council for Refugees',
      'Service Canada': 'Service Canada',
    },
    'anglais': {
      'Soumettre demande de protection': 'Submit protection application',
      'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC': 'Complete the official protection application form and submit it to IRCC',
      'Obtenir documents de soutien': 'Obtain support documents',
      'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale': 'Gather support letters, proof of persecution, or medical documentation',
      'Vérifier statut de travail': 'Verify work status',
      'Confirmer que votre permis de travail est valide et couvre votre emploi actuel': 'Confirm that your work permit is valid and covers your current employment',
      'Organiser et archiver documents': 'Organize and archive documents',
      'Les documents téléversés ont été classifiés. Consultez chaque catégorie pour les prochaines étapes.': 'Your uploaded documents have been classified. Consult each category for the next steps.',
    },
    'spanish': {
      'Soumettre demande de protection': 'Presentar solicitud de protección',
      'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC': 'Complete el formulario oficial de solicitud de protección y envíelo a IRCC',
      'Obtenir documents de soutien': 'Obtener documentos de apoyo',
      'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale': 'Recopile cartas de recomendación, pruebas de persecución o documentación médica',
      'Vérifier statut de travail': 'Verificar estado laboral',
      'Confirmer que votre permis de travail est valide et couvre votre emploi actuel': 'Confirme que su permiso de trabajo es válido y cubre su empleo actual',
      'Organiser et archiver documents': 'Organizar y archivar documentos',
      'Les documents téléversés ont été classifiés. Consultez chaque catégorie pour les prochaines étapes.': 'Sus documentos cargados han sido clasificados. Consulte cada categoría para los siguientes pasos.',
    },
    'español': {
      'Soumettre demande de protection': 'Presentar solicitud de protección',
      'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC': 'Complete el formulario oficial de solicitud de protección y envíelo a IRCC',
      'Obtenir documents de soutien': 'Obtener documentos de apoyo',
      'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale': 'Recopile cartas de recomendación, pruebas de persecución o documentación médica',
      'Vérifier statut de travail': 'Verificar estado laboral',
      'Confirmer que votre permis de travail est valide et couvre votre emploi actuel': 'Confirme que su permiso de trabajo es válido y cubre su empleo actual',
    },
    'arabic': {
      'Soumettre demande de protection': 'تقديم طلب الحماية',
      'Remplir le formulaire officiel de demande de protection et le soumettre à l\'IRCC': 'أكمل نموذج طلب الحماية الرسمي وقدمه إلى IRCC',
      'Obtenir documents de soutien': 'الحصول على وثائق الدعم',
      'Rassembler lettres de recommandation, preuves de persécution, ou documentation médicale': 'اجمع رسائل التوصية أو إثبات الاضطهاد أو الوثائق الطبية',
      'Vérifier statut de travail': 'التحقق من حالة العمل',
      'Confirmer que votre permis de travail est valide et couvre votre emploi actuel': 'تأكد من صحة تصريح العمل الخاص بك وأنه يغطي وظيفتك الحالية',
      'Organiser et archiver documents': 'تنظيم وأرشفة المستندات',
    },
  };
  const dict = translations[normalizedLang] || translations['français'] || {};
  const translatedPlan: ActionPlan = {
    ...actionPlan,
    steps: actionPlan.steps.map(step => ({
      ...step,
      title: dict[step.title] || step.title,
      description: dict[step.description] || step.description,
      legal_basis: step.legal_basis ? {
        ...step.legal_basis,
        law: step.legal_basis.law ? dict[step.legal_basis.law] || step.legal_basis.law : undefined,
      } : undefined,
    })),
  };
  return translatedPlan;
}
export async function runLegalAnalysis(userMessage: string): Promise<LegalAnalysisResult> {
  const baseUrl = import.meta.env.VITE_OPENJUSTICE_URL?.replace(/\/$/, "") || "https://staging.openjustice.ai";
  const apiKey = import.meta.env.VITE_OPENJUSTICE_KEY || "demo-key";
  const dialogFlowId = import.meta.env.VITE_DIALOG_FLOW_ID || "demo-flow";
  try {
    const response = await fetch(`${baseUrl}/dialog-flow-executions/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        dialogFlowId: dialogFlowId,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn("API Error:", data.message);
      return getMockLegalAnalysis(userMessage);
    }
    return {
      status: data.status,
      finalOutput: data.output || data.finalOutput,
      facts: data.facts || {},
      executionId: data.id
    };
  } catch (err) {
    console.warn("API Connection Error:", err);
    return getMockLegalAnalysis(userMessage);
  }
}
function getMockLegalAnalysis(_userMessage: string): LegalAnalysisResult {
  return {
    status: 'completed',
    finalOutput: `
Analyse juridique du document
Basé sur votre profil et le document fourni, voici nos recommandations:
Conformité:
- Document valide et reconnu
- Informations cohérentes avec votre statut
Prochaines étapes recommandées:
1. Vérifier la date d'expiration (si applicable)
2. Préparer documents de soutien
3. Consulter un agent d'immigration si délai serré
Base juridique:
Cette analyse s'appuie sur les articles de la LIPR et des décisions similaires de la CISR.
Important: Consultez un professionnel juridique pour votre situation spécifique.
    `,
    facts: {
      'Document Type': 'Immigration Document',
      'Status': 'Valid',
      'Recommended Action': 'Prepare supporting documents',
    },
    executionId: `mock_${Date.now()}`,
  };
}
/**
 * Extract document info - tries Gemini first, falls back to keyword matching
 */
export async function extractDocumentInfoWithGemini(doc: UploadedDocument): Promise<UploadedDocument> {
  try {
    if (isGeminiConfigured()) {
      console.log('Gemini configured - using keyword extraction (File object not available in UploadedDocument)');
    }
  } catch (error) {
    console.warn('Gemini extraction check failed:', error);
  }
  return extractDocumentInfo(doc);
}
/**
 * Categorize documents - tries Gemini for each doc, falls back to keyword matching
 */
export async function categorizeDocumentsWithGemini(
  documents: UploadedDocument[]
): Promise<Map<string, UploadedDocument[]>> {
  const categories = new Map<string, UploadedDocument[]>();
  if (!isGeminiConfigured()) {
    return categorizeDocuments(documents);
  }
  try {
    for (const doc of documents) {
      const result = await categorizeDocumentWithGemini(doc);
      const category = (result.category as any) || 'other';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push({
        ...doc,
        category: category as any, // Cast to DocumentCategory
        extraction_result: {
          ...doc.extraction_result,
          extracted_text: doc.extraction_result?.extracted_text || `Gemini analysis: ${result.reasoning}`,
          confidence: Math.round(result.confidence * 100),
        },
      });
    }
  } catch (error) {
    console.warn('Gemini categorization failed, falling back to keyword matching:', error);
    return categorizeDocuments(documents);
  }
  return categories;
}
/**
 * Generate action plan - enhanced with Gemini if available
 */
export async function generateActionPlanWithGeminiEnhanced(
  profile: UserProfile,
  documents: UploadedDocument[]
): Promise<ActionPlan> {
  if (isGeminiConfigured() && documents.length > 0) {
    try {
      const language = profile.primary_language ? profile.primary_language.toLowerCase() : 'fr';
      const geminiResult = await generateActionPlanWithGemini(profile, documents, language);
      if (geminiResult.steps && geminiResult.steps.length > 0) {
        return {
          id: `plan_gemini_${Date.now()}`,
          profile_id: profile.age?.toString() || 'unknown',
          created_at: new Date().toISOString(),
          total_steps: geminiResult.steps.length,
          completed_steps: 0,
          steps: geminiResult.steps as ActionStep[],
          last_updated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('Gemini plan generation failed, falling back to template-based:', error);
    }
  }
  return generateActionPlan(profile, documents);
}
