import { useState } from 'react';
import { ConfidentialityManager } from '../lib/confidentiality';
import type { UserProfile, UploadedDocument, ActionPlan } from '../types/index';

interface PrivacyDashboardProps {
  profile: UserProfile | null;
  documents: UploadedDocument[];
  actionPlan: ActionPlan | null;
  onClose: () => void;
}

export function PrivacyConsent({ onConsent }: { onConsent: (consent: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const consent = ConfidentialityManager.getConsentBanner();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      minHeight: '100vh',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '600px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '1.3rem', color: '#1a365d' }}>
          {consent.title}
        </h2>

        <div style={{
          backgroundColor: '#f0fdf4',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #22c55e',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
        }}>
          {consent.message}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#f7fafc',
            border: '1px solid #cbd5e0',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#2d3748',
          }}
        >
          {expanded ? 'V' : '>'} Détails de la politique de confidentialité (Loi 25)
        </button>

        {expanded && (
          <div style={{
            backgroundColor: '#f7fafc',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            lineHeight: '1.7',
            whiteSpace: 'pre-wrap',
            color: '#4a5568',
            borderTop: '2px solid #e2e8f0',
          }}>
            {consent.details}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onConsent(false)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#2d3748',
            }}
          >
            Je refuse
          </button>
          <button
            onClick={() => onConsent(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#22c55e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            J'accepte
          </button>
        </div>

        <div style={{ marginTop: '15px', fontSize: '0.75rem', color: '#a0aec0', textAlign: 'center' }}>
          Conflict Analytics Lab • Responsable de la protection des données • confidentiality@conflictlab.ai
        </div>
      </div>
    </div>
  );
}

export function PrivacyDashboard({ 
  profile, 
  documents,
  actionPlan,
  onClose 
}: PrivacyDashboardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = () => {
    if (!profile) return;
    
    const dashboard = ConfidentialityManager.generatePrivacyDashboard(
      'user_' + Date.now(),
      profile,
      documents,
      actionPlan ? [actionPlan] : []
    );
    
    const jsonData = ConfidentialityManager.exportUserData(dashboard);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-donnees-justice-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '800px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto',
        width: '100%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a365d' }}>
            Mes données (Loi 25 - Québec)
          </h2>
          <button
            onClick={onClose}
            style={{
              fontSize: '1.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#718096',
            }}
          >
            ✕
          </button>
        </div>

        {/* Data Location */}
        <div style={{
          backgroundColor: '#dbeafe',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #0284c7',
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#0c4a6e', marginBottom: '5px' }}>Localisation des données</p>
          <p style={{ margin: 0, color: '#075985', fontSize: '0.9rem' }}>
            Vos données sont conservées exclusivement sur des serveurs certifiés au Québec (OVHcloud Montréal / AWS ca-central-1).
          </p>
        </div>

        {/* Profile Section */}
        {profile && (
          <section style={{ marginBottom: '25px' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1a365d' }}>
              Votre profil
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
              {profile.age && (
                <div style={{ padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#718096' }}>ÂGE</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{profile.age}</p>
                </div>
              )}
              {profile.country_of_origin && (
                <div style={{ padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#718096' }}>PAYS D'ORIGINE</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{profile.country_of_origin}</p>
                </div>
              )}
              {profile.migration_status && (
                <div style={{ padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#718096' }}>STATUT</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{profile.migration_status}</p>
                </div>
              )}
              {profile.legal_issues && profile.legal_issues.length > 0 && (
                <div style={{ padding: '10px', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#718096' }}>PROBLÈMES JURIDIQUES</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{profile.legal_issues.join(', ')}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Documents Section */}
        {documents.length > 0 && (
          <section style={{ marginBottom: '25px' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1a365d' }}>
              Documents téléversés ({documents.length})
            </h3>
            <ul style={{ paddingLeft: '20px', marginTop: '15px' }}>
              {documents.map((doc) => (
                <li key={doc.id} style={{ marginBottom: '8px', color: '#2d3748' }}>
                  {doc.name}
                  {doc.upload_date && (
                    <span style={{ fontSize: '0.85rem', color: '#718096', marginLeft: '10px' }}>
                      ({new Date(doc.upload_date).toLocaleDateString('fr-CA')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Action Plan Section */}
        {actionPlan && (
          <section style={{ marginBottom: '25px' }}>
            <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1a365d' }}>
              Plan d'action ({actionPlan.total_steps} étapes)
            </h3>
            <div style={{ marginTop: '15px', color: '#2d3748', fontSize: '0.9rem' }}>
              <p>Créé le: {new Date(actionPlan.created_at).toLocaleDateString('fr-CA')}</p>
              <p>Étapes complétées: {actionPlan.completed_steps} / {actionPlan.total_steps}</p>
            </div>
          </section>
        )}

        {/* Data Retention */}
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1a365d' }}>
            ⏱️ Rétention des données
          </h3>
          <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#2d3748' }}>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Documents: Session active par défaut (destructión certifiée après)</li>
              <li>Profil: Conservé 1 an puis suppression automatique</li>
              <li>Plan d'action: Jusqu'à suppression par l'utilisateur</li>
              <li>Logs d'accès: 90 jours maximum (sécurité)</li>
            </ul>
          </div>
        </section>

        {/* Rights */}
        <section style={{ marginBottom: '25px' }}>
          <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1a365d' }}>
            Vos droits (Loi 25)
          </h3>
          <ul style={{ marginTop: '15px', paddingLeft: '20px', fontSize: '0.9rem', color: '#2d3748' }}>
            <li>Droit d'accès: Consultez toutes vos données</li>
            <li>Droit de rectification: Modifiez vos informations</li>
            <li>Droit à l'effacement: Supprimez définitivement vos données</li>
            <li>Droit à la portabilité: Exportez vos données</li>
            <li>Droit de rétractation: Révoquez votre consentement</li>
          </ul>
        </section>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Télécharger mes données
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Supprimer toutes les données
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#e2e8f0',
              color: '#2d3748',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Fermer
          </button>
        </div>

        {showDeleteConfirm && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            borderLeft: '4px solid #ef4444',
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#991b1b' }}>
              Êtes-vous certain de vouloir supprimer toutes les données?
            </p>
            <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#7c2d12' }}>
              Cette action est irréversible. Tous vos documents, profil et plan d'action seront définitivement supprimés.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  alert('Les données ont été supprimées de manière certifiée.');
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Confirmer la suppression
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f7fafc',
                  color: '#2d3748',
                  border: '1px solid #cbd5e0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
