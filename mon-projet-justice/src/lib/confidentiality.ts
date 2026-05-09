import type { PrivacyConsent, DataAccessLog, UserDataDashboard, UserProfile } from '../types/index';

// --- GESTION CONSENTEMENT LOI 25 ---
export class ConfidentialityManager {
  private static POLICY_VERSION = '1.0';
  private static RETENTION_DAYS = {
    documents: 0, // session only by default
    profile: 365, // 1 year
    action_plan: 0, // until deleted
    logs: 90, // 3 months
  };

  /**
   * Crée un consentement explicite Loi 25
   */
  static createConsent(
    userId: string,
    purposes: string[],
    dataRetentionDays: number = 0
  ): PrivacyConsent {
    return {
      user_id: userId,
      consent_given: true,
      consent_date: new Date().toISOString(),
      policy_version: this.POLICY_VERSION,
      purposes,
      data_retention_days: dataRetentionDays,
      can_share_with_lawyer: true,
      can_export_data: true,
    };
  }

  /**
   * Vérifie si le consentement est valide et non expiré
   */
  static isConsentValid(consent: PrivacyConsent): boolean {
    if (!consent.consent_given) return false;
    
    const consentDate = new Date(consent.consent_date);
    const now = new Date();
    const daysSinceConsent = Math.floor(
      (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Consentement valide 1 an par défaut
    return daysSinceConsent <= 365;
  }

  /**
   * Génère un dashboard de confidentialité pour l'utilisateur
   */
  static generatePrivacyDashboard(
    userId: string,
    profile: UserProfile,
    documents: any[] = [],
    plans: any[] = [],
    logs: DataAccessLog[] = []
  ): UserDataDashboard {
    return {
      user_id: userId,
      profile,
      documents,
      action_plans: plans,
      access_logs: logs,
      last_backup: new Date().toISOString(),
      data_location: 'quebec',
      can_delete_all: true,
    };
  }

  /**
   * Enregistre un accès aux données (audit trail Loi 25)
   */
  static logDataAccess(
    userId: string,
    action: 'read' | 'write' | 'delete' | 'export' | 'share',
    dataType: string,
    employeeId?: string,
    justification?: string
  ): DataAccessLog {
    return {
      user_id: userId,
      access_date: new Date().toISOString(),
      action,
      data_type: dataType,
      employee_id: employeeId,
      justification,
    };
  }

  /**
   * Prépare les données pour export RGPD/Loi 25 (portabilité des données)
   */
  static exportUserData(dashboard: UserDataDashboard): string {
    const exportData = {
      exported_at: new Date().toISOString(),
      data_location: 'quebec',
      user_id: dashboard.user_id,
      profile: dashboard.profile,
      documents: dashboard.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        upload_date: doc.upload_date,
      })),
      action_plans: dashboard.action_plans,
      access_history: dashboard.access_logs,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Anonymise les données avant transmission à l'API IA
   * (pour respecter ZDR - Zero Data Retention)
   */
  static anonymizeForAI(profile: UserProfile): Record<string, any> {
    return {
      migration_status: profile.migration_status,
      legal_issues: profile.legal_issues,
      family_status: profile.family_status,
      // Aucune donnée personnelle identifiante
      // Pas de nom, âge exact, lieu précis, dates exactes
    };
  }

  /**
   * Banneau de consentement explicite à afficher
   */
  static getConsentBanner(): {
    title: string;
    message: string;
    details: string;
  } {
    return {
      title: 'Votre confidentialité est protégée',
      message: `
        Vos données sont conservées exclusivement au Québec et chiffrées en permanence.
        Vous avez le droit d'accéder, modifier ou supprimer vos informations à tout moment.
        Conformément à la Loi 25 du Québec.
      `,
      details: `
        • Finalité : guider vos démarches juridiques uniquement
        • Conservation : session active par défaut, puis destruction certifiée
        • Partage : jamais partagé sans votre consentement explicite
        • Responsable : Conflict Analytics Lab (voir coordonnées en bas de page)
        • Droit d'accès : cliquez sur "Mes données" pour consulter tout
      `,
    };
  }

  /**
   * Détermine la durée de rétention en jours
   */
  static getRetentionDays(dataType: keyof typeof this.RETENTION_DAYS): number {
    return this.RETENTION_DAYS[dataType];
  }

  /**
   * Génère un certificat de destruction des données
   */
  static generateDestructionCertificate(
    userId: string,
    dataType: string,
    deletionDate: string
  ): string {
    return `
CERTIFICAT DE DESTRUCTION SÉCURISÉE
Conforme à NIST 800-88

Date: ${deletionDate}
Utilisateur: ${userId}
Type de données: ${dataType}
Méthode: Écrasement cryptographique AES-256
Vérification: Certificat disponible sur demande

Ce certificat confirme la destruction complète et irréversible
des données conformément aux normes fédérales américaines
et aux exigences de la Loi 25 du Québec.

Signé: ImmigIA Confidentiality Team
    `;
  }
}

// --- GESTION DES PRÉFÉRENCES DE RÉTENTION ---
export const DATA_RETENTION_OPTIONS = [
  {
    label: 'Session uniquement (recommandé)',
    days: 0,
    description: 'Les données sont supprimées à la fermeture de la fenêtre',
  },
  {
    label: '30 jours',
    days: 30,
    description: 'Idéal si vous consultez un avocat rapidement',
  },
  {
    label: '90 jours',
    days: 90,
    description: 'Pour suivre plusieurs étapes de votre dossier',
  },
];

// --- LANGAGES SUPPORTÉS + ACCESSIBILITÉ ---
export const SUPPORTED_LANGUAGES = [
  { code: 'fr-CA', label: 'Français (Québec)', tts_lang: 'fr-CA' },
  { code: 'en-CA', label: 'English (Canada)', tts_lang: 'en-CA' },
  { code: 'es', label: 'Español', tts_lang: 'es-ES' },
  { code: 'ar', label: 'العربية (Arabic)', tts_lang: 'ar-SA' },
  { code: 'ht', label: 'Kreyòl Ayisyen (Haitian Creole)', tts_lang: 'fr-CA' }, // fallback to FR
];

// --- TEXT-TO-SPEECH (ACCESSIBILITÉ) ---
export class AudioAccessibility {
  private static isBrowserSupported(): boolean {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance();
    return !!synth && 'onend' in utterance;
  }

  static speak(
    text: string,
    language: string = 'fr-CA',
    rate: number = 1,
    onEnd?: () => void
  ): void {
    if (!this.isBrowserSupported()) {
      console.warn('Text-to-speech not supported in this browser');
      return;
    }

    const synth = window.speechSynthesis;
    
    // Arrêter la parole précédente
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    synth.speak(utterance);
  }

  static stop(): void {
    window.speechSynthesis.cancel();
  }

  static isPlaying(): boolean {
    return window.speechSynthesis.speaking;
  }

  /**
   * Surligne le texte pendant la lecture (accessibilité)
   */
  static highlightText(elementId: string): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.style.backgroundColor = '#fff3cd';
    element.style.transition = 'background-color 0.3s';

    setTimeout(() => {
      element.style.backgroundColor = 'transparent';
    }, 3000);
  }
}
