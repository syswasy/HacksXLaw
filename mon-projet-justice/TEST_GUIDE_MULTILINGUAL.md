# JusticeAccess - Guide de Test Multilingue

## Démo Hackathon - Montreal AI x Law 2026

### Résumé des Modifications Implémentées

#### 1. **Fonction Décodeur de Langue (App.tsx)**
```typescript
function getLanguageCode(language?: string): string
```
- Mappe 30+ langues à leurs codes BCP 47 pour audio natif
- Exemples: français → fr-CA, anglais → en-US, arabe → ar-SA, espagnol → es-ES
- Défaut: français canadien (fr-CA)

#### 2. **Traduction du Plan d'Action (openJustice.ts)**
```typescript
export function translateActionPlan(actionPlan: ActionPlan, language?: string): ActionPlan
```
- Traduit les titres et descriptions des étapes du plan
- Support actuel: Français, Anglais, Espagnol, Arabe
- Facile d'ajouter d'autres langues dans le dictionnaire `translations`

#### 3. **Intégration Multilangue (App.tsx - StepActionPlan)**
- Reçoit la langue de l'utilisateur via prop `userLanguage`
- Traduit automatiquement le plan d'action
- Passe le code de langue correct à TextToSpeech pour audio natif

---

## Instructions de Test

### Scénario 1: Réfugié parlant Arabe
1. **Profil utilisateur:**
   - Age: 32
   - Pays d'origine: Syrie
   - Statut migratoire: Demandeur d'asile
   - Langue maternelle: **arabe**
   - Problèmes juridiques: Immigration, Logement

2. **Résultat attendu:**
   - ✅ Plan d'action traduit en arabe
   - ✅ Boutons audio: "Écouter" lisent le contenu en arabe (ar-SA)
   - ✅ Titre: "تقديم طلب الحماية" (Soumettre demande de protection)
   - ✅ Les étapes affichent les traductions arabes

3. **À tester:**
   ```
   Cliquez sur "[LISTEN] Écouter" et écoutez le plan d'action se lire en arabe
   Vérifiez que la voix est correcte (accent saoudien arabe)
   ```

### Scénario 2: Travailleur temporaire parlant Espagnol
1. **Profil utilisateur:**
   - Age: 28
   - Pays d'origine: Mexique
   - Statut migratoire: Travailleur temporaire
   - Langue maternelle: **español** (ou "spanish")
   - Problèmes juridiques: Emploi

2. **Résultat attendu:**
   - ✅ Plan d'action traduit en espagnol
   - ✅ Titre: "Verificar estado laboral" (Vérifier statut de travail)
   - ✅ Audio en espagnol (es-ES)

### Scénario 3: Immigrant parlant Anglais
1. **Profil utilisateur:**
   - Age: 45
   - Pays d'origine: Inde
   - Statut migratoire: Résident permanent
   - Langue maternelle: **english**
   - Problèmes juridiques: Emploi, Logement

2. **Résultat attendu:**
   - ✅ Plan d'action traduit en anglais
   - ✅ Audio en anglais américain (en-US)

### Scénario 4: Francophone (Contrôle Qualité)
1. **Profil utilisateur:**
   - Langue maternelle: **français** (défaut)

2. **Résultat attendu:**
   - ✅ Plan d'action reste en français
   - ✅ Audio en français canadien (fr-CA)

---

## Architecture Multilingue

### Flot de Données
```
UserProfile.primary_language
    ↓
App.tsx → StepActionPlan (prop userLanguage)
    ↓
getLanguageCode(userLanguage) → "ar-SA", "es-ES", etc.
    ↓
translateActionPlan(actionPlan, userLanguage)
    ↓
TextToSpeech language={languageCode}
    ↓
SpeechSynthesisUtterance.lang = languageCode
    ↓
Audio natif dans la langue de l'utilisateur
```

### Dictionnaire de Traduction
Situé dans `src/lib/openJustice.ts`:
- **Français**: Contient les textes originaux
- **Anglais**: Traductions en anglais
- **Espagnol**: Traductions en espagnol
- **Arabe**: Traductions en arabe

**Pour ajouter une langue:**
1. Ajouter code BCP 47 dans `getLanguageCode()`
2. Ajouter clé de langue dans `translations` avec les traductions
3. Tester avec un utilisateur parlant cette langue

---

## Langues Supportées (Codes BCP 47)

| Langue | Codes acceptés | Code Audio |
|--------|---|---|
| Français | french, français | fr-CA |
| Anglais | english, anglais | en-US |
| Espagnol | spanish, español | es-ES |
| Arabe | arabic, arabe | ar-SA |
| Mandarin | chinese, mandarin, chinois | zh-CN |
| Portugais | portuguese, portugais | pt-BR |
| Allemand | german, allemand | de-DE |
| Italien | italian, italien | it-IT |
| Russe | russian, russe | ru-RU |
| Japonais | japanese, japonais | ja-JP |
| Coréen | korean, coréen | ko-KR |
| Vietnamien | vietnamese, vietnamien | vi-VN |
| Tagalog | tagalog | tl-PH |
| Punjabi | punjabi | pa-IN |
| Hindi | hindi | hi-IN |
| Swahili | swahili | sw-KE |
| Somali | somali | so-SO |

---

## Points de Démonstration pour le Hackathon

### 1. **Accessibilité Multilingue**
"Notre application parle la langue de l'utilisateur"
- Montrer un réfugié arabophone recevant des conseils en arabe
- Montrer l'audio en arabe (Web Speech API natif)

### 2. **Scalabilité Simple**
"Ajouter une langue = 5 minutes"
- Montrer le dictionnaire de traduction
- Ajouter rapidement une nouvelle langue pendant la démo

### 3. **Juridique + Technologie**
"Conformité Loi 25 + Accessibilité Audio"
- Plan d'action = actionnable dans la langue maternelle
- Zero Data Retention = pas de serveur API pour traductions

### 4. **Flux Utilisateur Complet**
1. Remplir profil (incluant langue)
2. Télécharger documents
3. Voir plan d'action **traduit** dans sa langue
4. Cliquer "Écouter" → Audio en sa langue maternelle

---

## Points Techniques à Valider

### Code BCP 47 Correctness
```javascript
// Test dans la console du navigateur:
new SpeechSynthesisUtterance("Bonjour").lang = "fr-CA"
new SpeechSynthesisUtterance("مرحبا").lang = "ar-SA"
```

### Langues Fallback
Si l'utilisateur entre "arabic", "arabe", ou "العربية" → toutes mappées à "ar-SA" ✅

### Traduction Incomplète
Si une phrase n'est pas dans le dictionnaire, elle reste en français (fallback) ✅

---

## Fichiers Modifiés

```
src/App.tsx
├── + getLanguageCode() function (ligne ~15)
├── + translateActionPlan import (ligne ~5)
├── + StepActionPlan prop userLanguage (ligne ~400)
└── + TextToSpeech language={languageCode} (ligne ~520)

src/lib/openJustice.ts
├── + translateActionPlan() function (200+ lignes)
└── + translations dictionary (4 langues, extensible)
```

---

## Prochaines Étapes (Post-Hackathon)

1. **API de Traduction en Temps Réel**
   - Intégrer Google Translate API ou equivalent
   - Support illimité de langues

2. **Détection de Langue Automatique**
   - Utiliser browser language settings
   - Proposer auto-switch

3. **Traductions Professionnelles**
   - Engager traducteurs juridiques
   - Validation par experts en droit

4. **Multi-Locale Support**
   - Adapter les ressources par région
   - Ex: ar-SA vs ar-EG vs ar-MA

---

## Validations Lors de la Démo

✅ **Avant la présentation:**
- [ ] Build compile sans erreurs
- [ ] App démarre: `npm run dev`
- [ ] Insérer profil avec langue = "arabic"
- [ ] Vérifier plan d'action traduit
- [ ] Tester audio "Écouter" → arabe
- [ ] Tester avec "english" → anglais
- [ ] Tester avec "français" → français

✅ **Pendant la présentation:**
- Montrer le code de mapping (5 secondes)
- Montrer un utilisateur non-francophone → audio natif
- Montrer scalabilité (ajouter nouvelle langue)

---

**Contact Demo**: Montreal AI x Law Hackathon 2026 | Mai 9, 2026
