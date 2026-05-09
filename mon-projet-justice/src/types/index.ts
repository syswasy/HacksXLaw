// --- PROFIL UTILISATEUR ENRICHI ---
export interface UserProfile {
  // Identité
  age?: number;
  country_of_origin?: string;
  
  // Statut migratoire
  migration_status?: 'refugee' | 'temporary_resident' | 'asylum_seeker' | 'permanent_resident' | 'worker' | 'student' | 'visitor' | 'other';
  arrival_date?: string; // ISO date
  
  // Situation familiale
  family_status?: 'single' | 'married' | 'common_law' | 'divorced' | 'widowed' | 'with_dependents';
  dependent_count?: number;
  
  // Langues et communication
  primary_language?: string;
  secondary_languages?: string[];
  
  // Type de problème juridique (peut être multiple)
  legal_issues?: ('immigration' | 'employment' | 'housing' | 'human_rights' | 'family' | 'business' | 'debt' | 'health' | 'other')[];
  
  // Consentement Loi 25
  consent_data_collection?: boolean;
  consent_timestamp?: string;
  privacy_policy_version?: string;
}

// --- DOCUMENT TÉLÉCHARGÉ ---
export interface UploadedDocument {
  id: string;
  name: string;
  file_type?: string; // 'pdf' | 'image' | 'text'
  upload_date?: string;
  category?: DocumentCategory;
  extraction_result?: {
    document_type?: string; // 'passport', 'visa', 'contract', etc.
    confidence?: number; // 0-100
    extracted_text?: string;
    expiry_date?: string;
    issues?: string[];
  };
}

export type DocumentCategory = 
  | 'identity' 
  | 'migration_status' 
  | 'family' 
  | 'employment' 
  | 'housing' 
  | 'procedures' 
  | 'health' 
  | 'finance' 
  | 'other';

// --- PLAN D'ACTION ---
export interface ActionStep {
  id: string;
  order: number;
  title: string;
  description: string;
  deadline_days?: number; // jours avant deadline
  required_documents?: string[];
  legal_basis?: {
    law?: string; // ex: "LIPR Art. 49"
    court_decisions?: {
      case_id: string;
      court: string;
      year: number;
      outcome: 'favorable' | 'unfavorable' | 'mixed';
      relevance_score: number; // 0-100
      url?: string;
    }[];
  };
  form_url?: string;
  help_contact?: {
    organization?: string;
    phone?: string;
    website?: string;
  };
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ActionPlan {
  id: string;
  profile_id: string;
  created_at: string;
  total_steps: number;
  completed_steps: number;
  steps: ActionStep[];
  last_updated: string;
}

// --- RÉSULTAT ANALYSE DOCUMENT ---
export interface DocumentAnalysis {
  document_id: string;
  document_type: string;
  analysis: {
    summary: string;
    urgency_flag?: boolean;
    urgency_reason?: string;
    expiry_issues?: string[];
    missing_documents?: string[];
    next_steps: string[];
    applicable_laws: string[];
    related_cases: Array<{
      case_id: string;
      relevance: number;
      url: string;
    }>;
  };
}

// --- RÉSULTAT API OpenJustice ---
export interface OpenJusticeResult {
  status: string;
  profile_summary?: Record<string, any>;
  action_plan?: ActionPlan;
  success_probability?: {
    percentage: number;
    based_on_cases: number;
  };
  cited_cases?: Array<{
    id: string;
    court: string;
    year: number;
    summary: string;
    url: string;
  }>;
  recommendations?: string[];
  warnings?: string[];
  executionId?: string;
}

// --- DONNÉES CONFIDENTIALITÉ (Loi 25) ---
export interface PrivacyConsent {
  user_id: string;
  consent_given: boolean;
  consent_date: string;
  policy_version: string;
  purposes: string[]; // raisons de la collecte
  data_retention_days?: number; // durée de rétention
  can_share_with_lawyer?: boolean;
  can_export_data?: boolean;
}

export interface DataAccessLog {
  user_id: string;
  access_date: string;
  action: 'read' | 'write' | 'delete' | 'export' | 'share';
  data_type: string;
  employee_id?: string;
  justification?: string;
}

export interface UserDataDashboard {
  user_id: string;
  profile: UserProfile;
  documents: UploadedDocument[];
  action_plans: ActionPlan[];
  access_logs: DataAccessLog[];
  last_backup?: string;
  data_location: 'quebec' | 'restricted';
  can_delete_all?: boolean;
}
