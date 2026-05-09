import { useState } from 'react';
import { 
  generateActionPlan, 
  categorizeDocuments,
  extractDocumentInfo,
  translateActionPlan,
  categorizeDocumentsWithGemini,
  generateActionPlanWithGeminiEnhanced
} from './lib/openJustice';
import { isGeminiConfigured } from './lib/geminiClient';
import type { ActionPlan } from './lib/openJustice';
import { PrivacyConsent, PrivacyDashboard } from './components/PrivacyDashboard';
import { TextToSpeech } from './components/TextToSpeech';
import type { UserProfile, UploadedDocument } from './types/index';

// --- LANGUAGE DECODER FOR AUDIO ---
function getLanguageCode(language?: string): string {
  const languageMap: Record<string, string> = {
    'french': 'fr-CA', 'français': 'fr-CA',
    'english': 'en-US', 'anglais': 'en-US',
    'spanish': 'es-ES', 'español': 'es-ES',
    'arabic': 'ar-SA', 'arabe': 'ar-SA',
    'chinese': 'zh-CN', 'mandarin': 'zh-CN', 'chinois': 'zh-CN',
    'portuguese': 'pt-BR', 'portugais': 'pt-BR',
    'german': 'de-DE', 'allemand': 'de-DE',
    'italian': 'it-IT', 'italien': 'it-IT',
    'russian': 'ru-RU', 'russe': 'ru-RU',
    'japanese': 'ja-JP', 'japonais': 'ja-JP',
    'korean': 'ko-KR', 'coréen': 'ko-KR',
    'vietnamese': 'vi-VN', 'vietnamien': 'vi-VN',
    'tagalog': 'tl-PH', 'punjabi': 'pa-IN',
    'hindi': 'hi-IN', 'swahili': 'sw-KE', 'somali': 'so-SO',
  };
  const normalized = (language || 'français').toLowerCase().trim();
  return languageMap[normalized] || 'fr-CA';
}

// --- LOCAL TYPES ---
interface DocumentCategory {
  name: string;
  icon: string;
  documents: UploadedDocument[];
}

// --- URGENCY HELPERS ---
function getUrgencyLevel(days: number | undefined): 'urgent' | 'medium' | 'normal' {
  if (!days || days === 0) return 'normal';
  if (days <= 7) return 'urgent';
  if (days <= 14) return 'medium';
  return 'normal';
}

const URGENCY_STYLES = {
  urgent: {
    badge: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' },
    label: 'Urgent',
    dot: '#ef4444',
  },
  medium: {
    badge: { background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' },
    label: 'Prioritaire',
    dot: '#eab308',
  },
  normal: {
    badge: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
    label: 'Standard',
    dot: '#22c55e',
  },
};

// --- ACTION STEP CARD ---
function ActionStepCard({
  step,
  index,
  isSelected,
  isCompleted,
  onSelect,
  onToggleComplete,
}: {
  step: any;
  index: number;
  isSelected: boolean;
  isCompleted: boolean;
  onSelect: () => void;
  onToggleComplete: () => void;
}) {
  const urgency = getUrgencyLevel(step.deadline_days);
  const urgencyStyle = URGENCY_STYLES[urgency];

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        padding: '20px 22px',
        borderRadius: '14px',
        border: isSelected
          ? '2px solid #3182ce'
          : isCompleted
          ? '2px solid #22c55e'
          : '2px solid #e2e8f0',
        background: isCompleted ? '#f0fdf4' : isSelected ? '#eff6ff' : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: isSelected
          ? '0 4px 16px rgba(49,130,206,0.13)'
          : '0 1px 4px rgba(0,0,0,0.05)',
        opacity: isCompleted ? 0.75 : 1,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          minWidth: '32px', height: '32px', borderRadius: '50%',
          background: isCompleted ? '#22c55e' : isSelected ? '#3182ce' : '#e2e8f0',
          color: isCompleted || isSelected ? '#fff' : '#4a5568',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
          transition: 'all 0.18s',
        }}>
          {isCompleted ? '✓' : index + 1}
        </div>

        <span style={{
          fontWeight: 600, fontSize: '1rem',
          color: isCompleted ? '#166534' : '#1a365d',
          flex: 1, lineHeight: 1.3,
        }}>
          {step.title}
        </span>

        {step.deadline_days > 0 && (
          <span style={{
            ...urgencyStyle.badge,
            padding: '4px 10px', borderRadius: '20px',
            fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' as const,
            display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: urgencyStyle.dot, display: 'inline-block',
            }} />
            {step.deadline_days}j — {urgencyStyle.label}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{
        margin: '0 0 0 44px', color: '#4a5568', fontSize: '0.9rem',
        lineHeight: 1.55,
        display: '-webkit-box' as any,
        WebkitLineClamp: isSelected ? 'unset' : 2,
        WebkitBoxOrient: 'vertical' as any,
        overflow: isSelected ? 'visible' : 'hidden',
      }}>
        {step.description}
      </p>

      {/* Expanded details */}
      {isSelected && (
        <div style={{ marginTop: '16px', marginLeft: '44px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {step.legal_basis?.law && (
            <div style={{
              background: '#dbeafe', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.82rem', color: '#1e40af',
            }}>
              <strong>Base légale :</strong> {step.legal_basis.law}
            </div>
          )}

          {step.required_documents?.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '0.82rem', fontWeight: 600, color: '#2d3748' }}>
                Documents requis :
              </p>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#4a5568' }}>
                {step.required_documents.map((doc: string, i: number) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {step.form_url && (
              <a
                href={step.form_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '7px 14px', background: '#3182ce', color: '#fff',
                  borderRadius: '8px', textDecoration: 'none',
                  fontSize: '0.82rem', fontWeight: 600,
                }}
              >
                Formulaire officiel →
              </a>
            )}
            {step.help_contact?.website && (
              <a
                href={step.help_contact.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '7px 14px', background: '#10b981', color: '#fff',
                  borderRadius: '8px', textDecoration: 'none',
                  fontSize: '0.82rem', fontWeight: 600,
                }}
              >
                Aide juridique →
              </a>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
            style={{
              alignSelf: 'flex-start',
              marginTop: '4px',
              padding: '7px 16px',
              borderRadius: '8px',
              border: isCompleted ? '1.5px solid #22c55e' : '1.5px solid #cbd5e0',
              background: isCompleted ? '#f0fdf4' : '#f7fafc',
              color: isCompleted ? '#166534' : '#4a5568',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isCompleted ? '✓ Étape complétée' : 'Marquer comme complétée'}
          </button>
        </div>
      )}

      {!isSelected && !isCompleted && (
        <p style={{ margin: '6px 0 0 44px', fontSize: '0.75rem', color: '#a0aec0' }}>
          Cliquer pour voir les détails
        </p>
      )}
    </div>
  );
}

// --- STEP 1: ENRICHED USER PROFILE ---
function StepUserProfile({ 
  profile, 
  onProfileChange, 
  onNext,
  loading 
}: { 
  profile: UserProfile;
  onProfileChange: (key: keyof UserProfile, value: any) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const isComplete = profile.migration_status && profile.legal_issues && profile.legal_issues.length > 0;
  
  const handleLegalIssuesChange = (issue: string) => {
    const current = profile.legal_issues || [];
    if (current.includes(issue as any)) {
      onProfileChange('legal_issues', current.filter((i: string) => i !== issue));
    } else {
      onProfileChange('legal_issues', [...current, issue]);
    }
  };

  return (
    <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '30px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Étape 1 / 4</span>
        <h2 style={{ fontSize: '1.5rem', marginTop: '10px', marginBottom: '10px' }}>Votre Profil Juridique</h2>
        <p style={{ color: '#718096', marginTop: 0 }}>Aidez-nous à comprendre votre situation pour personnaliser les conseils</p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Âge</label>
          <input 
            type="number" 
            value={profile.age || ''} 
            onChange={(e) => onProfileChange('age', parseInt(e.target.value))}
            placeholder="ex: 35"
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Pays d'origine</label>
          <input 
            type="text" 
            value={profile.country_of_origin || ''} 
            onChange={(e) => onProfileChange('country_of_origin', e.target.value)}
            placeholder="ex: Syrie, Haïti, Pakistan..."
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Statut migratoire *</label>
          <select 
            value={profile.migration_status || ''} 
            onChange={(e) => onProfileChange('migration_status', e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem' }}
          >
            <option value="">Sélectionnez...</option>
            <option value="refugee">Réfugié reconnu</option>
            <option value="asylum_seeker">Demandeur d'asile</option>
            <option value="temporary_resident">Résident temporaire</option>
            <option value="permanent_resident">Résident permanent</option>
            <option value="worker">Travailleur temporaire</option>
            <option value="student">Étudiant international</option>
            <option value="visitor">Visiteur</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Date d'arrivée (approximatif)</label>
          <input 
            type="date" 
            value={profile.arrival_date || ''} 
            onChange={(e) => onProfileChange('arrival_date', e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Situation familiale</label>
          <select 
            value={profile.family_status || ''} 
            onChange={(e) => onProfileChange('family_status', e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem' }}
          >
            <option value="">Non spécifié</option>
            <option value="single">Célibataire</option>
            <option value="married">Marié(e)</option>
            <option value="common_law">Union libre</option>
            <option value="divorced">Divorcé(e)</option>
            <option value="widowed">Veuf/Veuve</option>
            <option value="with_dependents">Avec dépendants</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Nombre de dépendants</label>
          <input 
            type="number" 
            value={profile.dependent_count || ''} 
            onChange={(e) => onProfileChange('dependent_count', parseInt(e.target.value))}
            placeholder="0"
            min="0"
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '12px' }}>Types de problèmes juridiques * (sélectionnez un ou plusieurs)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            {['immigration', 'employment', 'housing', 'human_rights', 'family', 'business', 'debt', 'health'].map((issue: string) => (
              <label key={issue} style={{ display: 'flex', alignItems: 'center', padding: '8px', backgroundColor: '#f7fafc', borderRadius: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={(profile.legal_issues || []).includes(issue as any)}
                  onChange={() => handleLegalIssuesChange(issue)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  {issue === 'immigration' && 'Immigration'}
                  {issue === 'employment' && 'Emploi'}
                  {issue === 'housing' && 'Logement'}
                  {issue === 'human_rights' && 'Droits'}
                  {issue === 'family' && 'Famille'}
                  {issue === 'business' && 'Affaires'}
                  {issue === 'debt' && 'Dettes'}
                  {issue === 'health' && 'Santé'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Langues parlées</label>
          <input 
            type="text" 
            value={profile.primary_language || ''} 
            onChange={(e) => onProfileChange('primary_language', e.target.value)}
            placeholder="ex: Français, Arabe, Anglais..."
            style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <button 
        onClick={onNext}
        disabled={!isComplete || loading}
        style={{ 
          width: '100%', padding: '14px', marginTop: '30px',
          backgroundColor: isComplete && !loading ? '#3182ce' : '#cbd5e0', 
          color: 'white', borderRadius: '12px', border: 'none',
          fontWeight: 'bold', fontSize: '1rem',
          cursor: isComplete && !loading ? 'pointer' : 'not-allowed'
        }}
      >
        {loading ? 'Traitement...' : 'Continuer vers étape 2'}
      </button>
    </section>
  );
}

// --- STEP 2: DOCUMENT UPLOAD ---
function StepDocumentUpload({ 
  documents,
  onDocumentsAdd,
  onNext,
  onBack,
  loading
}: { 
  documents: UploadedDocument[];
  onDocumentsAdd: (docs: UploadedDocument[]) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      const newDocs = Array.from(files).map((file, idx) => ({
        id: `doc_${Date.now()}_${idx}`,
        name: file.name,
        file_type: file.type,
        upload_date: new Date().toISOString(),
      }));
      onDocumentsAdd([...documents, ...newDocs]);
    }
  };

  return (
    <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '30px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Étape 2 / 4</span>
        <h2 style={{ fontSize: '1.5rem', marginTop: '10px', marginBottom: '10px' }}>Téléchargez vos documents</h2>
        <p style={{ color: '#718096', marginTop: 0 }}>Contrats, lettres, permis, avis, passeport, visa, etc.</p>
      </div>

      <div style={{ 
        border: '2px dashed #cbd5e0', borderRadius: '12px', padding: '40px',
        textAlign: 'center', backgroundColor: '#f7fafc', marginBottom: '20px'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#cbd5e0' }}>[ ]</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '10px' }}>Glissez-déposez vos documents ici</p>
        <p style={{ color: '#718096', marginBottom: '20px' }}>ou</p>
        <input 
          type="file" multiple onChange={handleFileChange}
          id="file-input" style={{ display: 'none' }}
        />
        <label 
          htmlFor="file-input"
          style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sélectionner des fichiers
        </label>
      </div>

      {documents.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#ebf8ff', borderRadius: '12px', borderLeft: '4px solid #3182ce' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Documents téléchargés ({documents.length}):</p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {documents.map((doc) => (
              <li key={doc.id} style={{ marginBottom: '5px' }}>{doc.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
        <button onClick={onBack} style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', color: '#2d3748', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
          ← Retour
        </button>
        <button 
          onClick={onNext}
          disabled={documents.length === 0 || loading}
          style={{ flex: 1, padding: '12px', backgroundColor: documents.length > 0 && !loading ? '#3182ce' : '#cbd5e0', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: documents.length > 0 && !loading ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Traitement...' : 'Continuer vers étape 3'}
        </button>
      </div>
    </section>
  );
}

// --- STEP 3: CATEGORIZE DOCUMENTS ---
function StepCategorizeDocuments({ 
  categories, onNext, onBack, loading
}: { 
  categories: DocumentCategory[];
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '30px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Étape 3 / 4</span>
        <h2 style={{ fontSize: '1.5rem', marginTop: '10px', marginBottom: '10px' }}>Vos documents par catégorie</h2>
        <p style={{ color: '#718096', marginTop: 0 }}>Vos documents ont été automatiquement triés</p>
      </div>

      {categories.length === 0 ? (
        <div style={{ padding: '20px', backgroundColor: '#fef3c7', borderRadius: '12px', borderLeft: '4px solid #f59e0b', marginBottom: '30px' }}>
          <p style={{ margin: 0 }}> Les catégories seront déterminées après analyse. Cliquez sur « Continuer » pour procéder.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px', marginBottom: '30px' }}>
          {categories.map((cat) => (
            <div key={cat.name} style={{ padding: '15px', backgroundColor: '#ebf8ff', borderRadius: '12px', borderLeft: '4px solid #3182ce' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{cat.icon} {cat.name}</p>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {cat.documents.map((doc) => (
                  <li key={doc.id}>{doc.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onBack} style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', color: '#2d3748', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
          ← Retour
        </button>
        <button 
          onClick={onNext}
          disabled={loading}
          style={{ flex: 1, padding: '12px', backgroundColor: !loading ? '#3182ce' : '#cbd5e0', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: !loading ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Traitement...' : 'Continuer vers étape 4'}
        </button>
      </div>
    </section>
  );
}

// --- STEP 4: ACTION PLAN — SELECTABLE CARDS ---
function StepActionPlan({ 
  actionPlan,
  onBack,
  userLanguage
}: { 
  actionPlan: ActionPlan | null;
  onBack: () => void;
  userLanguage?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const displayPlan = userLanguage && actionPlan
    ? translateActionPlan(actionPlan, userLanguage)
    : actionPlan;

  const languageCode = getLanguageCode(userLanguage);

  const toggleComplete = (index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  if (!displayPlan) {
    return (
      <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ color: '#718096', fontSize: '1.1rem' }}>Génération du plan d'action en cours...</p>
        </div>
      </section>
    );
  }

  const planText = displayPlan.steps.map((s: any) => `${s.title}: ${s.description}`).join('\n\n');
  const completedCount = completedSteps.size;
  const totalCount = displayPlan.total_steps;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase' }}>Étape 4 / 4</span>
        <h2 style={{ fontSize: '1.5rem', margin: '10px 0 6px', color: '#1a365d' }}>Votre Plan d'Action Personnalisé</h2>
        <p style={{ color: '#718096', margin: 0, fontSize: '0.95rem' }}>
          Sélectionnez une étape pour voir les détails et les ressources disponibles.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 600 }}>
            Progression : {completedCount} / {totalCount} étapes
          </span>
          <span style={{ fontSize: '0.85rem', color: completedCount === totalCount ? '#166534' : '#3182ce', fontWeight: 700 }}>
            {progressPct}%
          </span>
        </div>
        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: completedCount === totalCount ? '#22c55e' : '#3182ce',
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Audio */}
      <div style={{ marginBottom: '24px' }}>
        <TextToSpeech text={planText} language={languageCode} disabled={!planText} />
      </div>

      {/* Selectable step cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {displayPlan.steps.map((step: any, idx: number) => (
          <ActionStepCard
            key={step.id ?? idx}
            step={step}
            index={idx}
            isSelected={selectedIndex === idx}
            isCompleted={completedSteps.has(idx)}
            onSelect={() => setSelectedIndex(selectedIndex === idx ? null : idx)}
            onToggleComplete={() => toggleComplete(idx)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={onBack}
          style={{ flex: 1, padding: '12px', backgroundColor: '#e2e8f0', color: '#2d3748', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
        >
          ← Retour
        </button>
        <button 
          onClick={() => window.print()}
          style={{ flex: 1, padding: '12px', backgroundColor: '#3182ce', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
        >
          🖨️ Imprimer le plan
        </button>
      </div>
    </section>
  );
}

// --- MAIN APP ---
function App() {
  const [step, setStep] = useState(0);
  const [hasConsent, setHasConsent] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);

  const handleConsentDecision = (consent: boolean) => {
    if (!consent) {
      alert('Vous devez accepter la politique de confidentialité pour continuer.');
      return;
    }
    setHasConsent(true);
    setStep(1);
  };

  const handleProfileChange = (key: keyof UserProfile, value: any) => {
    setProfile({ ...profile, [key]: value });
  };

  const handleNextStep = async () => {
    if (step === 1 && profile.migration_status && profile.legal_issues?.length) {
      setStep(2);
    } else if (step === 2 && documents.length > 0) {
      setStep(3);
      setLoading(true);
      try {
        const extractedDocs = documents.map(doc => extractDocumentInfo(doc));
        setDocuments(extractedDocs);
        
        let docMap: Map<string, UploadedDocument[]>;
        if (isGeminiConfigured()) {
          docMap = await categorizeDocumentsWithGemini(extractedDocs);
        } else {
          docMap = categorizeDocuments(extractedDocs);
        }
        
        const categoriesArray: DocumentCategory[] = Array.from(docMap.entries()).map(([name, docs]) => {
          const icons: { [key: string]: string } = {
            identity: '[ID]', migration_status: '[VISA]', family: '[FAM]',
            employment: '[EMP]', housing: '[LOG]', procedures: '[DOC]',
            health: '[SANTE]', finance: '[FINANCE]', other: '[???]'
          };
          return {
            name: name.replace(/_/g, ' ').toUpperCase(),
            icon: icons[name] || '[???]',
            documents: docs
          };
        });
        setCategories(categoriesArray);
      } catch (err) {
        console.error('Categorization error:', err);
        setCategories([{ name: 'DOCUMENTS', icon: '[???]', documents: documents.map(d => extractDocumentInfo(d)) }]);
      } finally {
        setLoading(false);
      }
    } else if (step === 3) {
      setStep(4);
      setLoading(true);
      try {
        let plan: ActionPlan;
        if (isGeminiConfigured()) {
          plan = await generateActionPlanWithGeminiEnhanced(profile, documents);
        } else {
          plan = await generateActionPlan(profile, documents);
        }
        setActionPlan(plan);
      } catch (err) {
        console.error('Action plan generation error:', err);
        alert('Erreur lors de la génération du plan d\'action.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      if (step === 3) setActionPlan(null);
    }
  };

  if (!hasConsent) {
    return <PrivacyConsent onConsent={handleConsentDecision} />;
  }

  if (showPrivacyDashboard) {
    return (
      <PrivacyDashboard 
        profile={profile}
        documents={documents}
        actionPlan={actionPlan}
        onClose={() => setShowPrivacyDashboard(false)}
      />
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#2d3748', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: '#1a365d', margin: 0 }}>JusticeAccess</h1>
          <p style={{ color: '#718096', marginTop: '5px', margin: 0 }}>Guidance juridique intelligente • Powered by OpenJustice</p>
        </div>
        <button
          onClick={() => setShowPrivacyDashboard(true)}
          style={{ padding: '10px 15px', backgroundColor: '#ecfdf5', border: '2px solid #10b981', color: '#059669', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
          title="Voir et gérer vos données"
        >
          [CONF] Mes données
        </button>
      </header>

      {/* Progress Bar */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginBottom: '10px' }}>
          {['Profil', 'Documents', 'Catégories', 'Plan d\'action'].map((_: any, idx: any) => (
            <div 
              key={idx}
              style={{
                flex: 1, height: '6px',
                backgroundColor: step > idx + 1 ? '#22c55e' : step === idx + 1 ? '#3182ce' : '#e2e8f0',
                borderRadius: '3px', transition: 'all 0.3s'
              }}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <StepUserProfile 
          profile={profile}
          onProfileChange={handleProfileChange}
          onNext={handleNextStep}
          loading={loading}
        />
      )}
      {step === 2 && (
        <StepDocumentUpload 
          documents={documents}
          onDocumentsAdd={setDocuments}
          onNext={handleNextStep}
          onBack={handleBack}
          loading={loading}
        />
      )}
      {step === 3 && (
        <StepCategorizeDocuments 
          categories={categories}
          onNext={handleNextStep}
          onBack={handleBack}
          loading={loading}
        />
      )}
      {step === 4 && (
        <StepActionPlan 
          actionPlan={actionPlan}
          onBack={handleBack}
          userLanguage={profile.primary_language}
        />
      )}

      <footer style={{ marginTop: '60px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px', color: '#a0aec0', fontSize: '0.9rem' }}>
        <strong>Montreal AI x Law Hackathon 2026</strong> | Conforme à la Loi 25 (Québec) | Données au Québec | Zero Data Retention
      </footer>
    </div>
  );
}

export default App;
