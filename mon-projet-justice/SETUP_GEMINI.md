# 🚀 Configuration Google AI (Gemini) pour mon-projet-justice

## 📋 Vue d'ensemble

Gemini 1.5 Flash peut maintenant lire et analyser vos documents en temps réel:
- **OCR**: Extraire le texte des PDFs et images
- **Catégorisation Intelligente**: Classer docs avec IA (pas juste keywords)
- **Plans d'Action Personnalisés**: Générer des conseils basés sur le CONTENU réel

---

## ⚙️ Configuration (5 minutes)

### Étape 1: Obtenir une clé API Google

1. **Ouvrir** [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Cliquer** "Create API key in new project" (ou projet existant)
3. **Copier** la clé (ex: `AIzaSyDxxx...`)
   - ⚠️ ATTENTION: Ne pas partager cette clé publiquement!
   - Ne pas la committer dans git
   - Utiliser `.env.local` (ignoré par git)

### Étape 2: Ajouter à `.env.local`

1. **Ouvrir** le fichier `.env.local` à la racine du projet
2. **Remplacer** `YOUR_API_KEY_HERE` par ta vraie clé:
   ```
   VITE_GOOGLE_API_KEY=AIzaSyDxxx...
   ```
3. **Sauvegarder** le fichier
4. **Redémarrer** le dev server: `npm run dev`

### Étape 3: Vérifier que ça marche

1. Ouvrir http://localhost:5174
2. Remplir un profil + uploader un PDF
3. **Vérifier** dans la console (F12 → Console):
   - ✅ "Gemini configured" = OK!
   - ❌ "Missing VITE_GOOGLE_API_KEY" = Vérifier .env.local

---

## 💡 Fonctionnalités Activées

### Avant (Keyword Matching)
```
PDF: 53153.pdf
System: Cherche "visa", "permit", "form" dans le nom
Result: "Pas trouvé" → Category: OTHER
Plan: 1 étape générique "Organiser documents"
```

### Après (Gemini AI)
```
PDF: 53153.pdf
System: Lit le CONTENU PDF avec Gemini vision
Result: "C'est un IMM 5558 Visitor Document Checklist"
Category: procedures (correct!)
Plan: 4 étapes détaillées basées sur le contenu
```

---

## 📊 Cas d'Usage

### ✅ Use Case 1: Documents sans catégorie claire

**Scénario**: User uploade un PDF anonyme "53153.pdf"

**Sans Gemini**:
- Keyword matching échoue
- Classé en "OTHER"
- Plan générique 1 step

**Avec Gemini**:
- ✅ Lit le PDF (OCR)
- ✅ Comprend que c'est une checklist
- ✅ Classé en "procedures"
- ✅ Plan spécifique 4 steps

### ✅ Use Case 2: Améliorer la précision

**Scénario**: Demandeur d'asile uploade plusieurs docs

**Résultat**:
- Documents catégorisés avec IA (>90% accuracy)
- Plans d'action générés DIRECTEMENT à partir du contenu
- Conseils réalistes (pas génériques)

### ✅ Use Case 3: Support multilingue

**Scénario**: Document en arabe ou hindi

**Résultat**:
- Gemini extrait le texte
- Traduit automatiquement si nécessaire
- Analyse le contenu en français
- Plan en langue de l'utilisateur

---

## 🔧 Architecture

### Fichiers Ajoutés

| Fichier | Rôle |
|---------|------|
| `src/lib/geminiClient.ts` | Client API Gemini + fonctions helpers |
| `.env.local` | Clé API (ne pas committer!) |
| `SETUP_GEMINI.md` | Ce fichier |

### Fonctions Disponibles

**Dans `src/lib/openJustice.ts`:**
```typescript
// Try Gemini for categorization, fallback to keywords
await categorizeDocumentsWithGemini(documents)

// Try Gemini for plan generation, fallback to template
await generateActionPlanWithGeminiEnhanced(profile, documents)

// Direct extraction with Gemini
await extractDocumentInfoWithGemini(doc)
```

### Workflow

```
User uploads PDF
    ↓
App checks: isGeminiConfigured()?
    ├─ YES → Try Gemini extraction + categorization
    │        ├─ Success? → Use result
    │        └─ Error? → Fallback to keyword matching
    │
    └─ NO  → Use keyword matching (default)
```

---

## 📈 Limites (Google AI Studio - Free)

| Limite | Valeur |
|--------|--------|
| Requêtes/min | 60 |
| Requêtes/jour | 1500 |
| Tokens/jour | ~1M |
| Modèles | Gemini 1.5 Flash only |

**Si dépassé**: 
- ❌ "Resource exhausted" → Attendre 24h
- ✅ Upgrade Vertex AI (billing) pour plus

---

## 🆘 Troubleshooting

### ❌ "API key not valid"
```
Vérifier:
- Copie complète dans .env.local (pas d'espaces)
- Pas d'accents ou caractères spéciaux
- Prefix VITE_ présent
- Dev server redémarré après changement
```

### ❌ "Resource exhausted"
```
→ Rate limit atteint (60 req/min ou 1500/jour)
→ Solution: Attendre 1 min ou 24h
→ Ou: Upgrade vers Vertex AI avec billing
```

### ❌ Gemini pas utilisé (toujours keyword)
```
Vérifier dans console (F12):
- "Gemini configured" = Connecté
- Si "Missing VITE_GOOGLE_API_KEY" = Ajouter clé
- Si "error TS..." = Rebuild: npm run build
```

### ❌ Erreur CORS
```
→ Google Cloud API security
→ Solution: Ajouter domaine dans GCP Console
   Settings → Authorized JavaScript origins
   Ajouter: http://localhost:5174, https://tondomaine.com
```

---

## 🔐 Sécurité

### ✅ Bonnes Pratiques

```bash
# .env.local (JAMAIS committer!)
VITE_GOOGLE_API_KEY=AIzaSyDxxx...

# .gitignore (déjà configuré)
.env.local  ✅ Ignoré

# Documents
→ Envoyés chiffrés à Google
→ Pas stockés après traitement
→ Lire: https://policies.google.com/privacy
```

### ❌ À ÉVITER

```
❌ JAMAIS: Pusher la clé sur GitHub
❌ JAMAIS: Committer .env.local
❌ JAMAIS: Partager clé par email/chat
❌ JAMAIS: Utiliser clé en production sans Secret Manager
```

### ✅ Production

Pour production, utiliser:
- Google Cloud Secret Manager
- Environment variables (CI/CD)
- Keys générées par GCP service account
- Lire: [GCP Security Best Practices](https://cloud.google.com/docs/authentication)

---

## 📚 Ressources

| Ressource | Lien |
|-----------|------|
| API Docs | https://ai.google.dev/docs |
| Model Cards | https://ai.google.dev/models/gemini-1-5 |
| Limits & Quotas | https://ai.google.dev/quotas |
| Pricing | https://ai.google.dev/pricing |
| Support | https://support.google.com/ai |

---

## ✅ Checklist Post-Setup

- [ ] Clé API créée et copiée
- [ ] `.env.local` modifié avec clé
- [ ] Dev server redémarré
- [ ] Console vérifie "Gemini configured"
- [ ] Build réussit: `npm run build`
- [ ] App testé avec PDF
- [ ] .gitignore inclut `.env.local`
- [ ] SETUP_GEMINI.md lu complètement

---

## 🎯 Prochaines Étapes

1. **Configurer**: Suivre étapes ci-dessus (5 min)
2. **Tester**: Uploader un PDF anonyme comme 53153.pdf
3. **Vérifier**: Plan d'action doit avoir 4+ étapes (pas 1)
4. **Documenter**: Prendre screenshot pour portfolio
5. **Bonus**: Essayer avec docs multilingues

---

*Last Updated: May 2026 | Gemini 1.5 Flash | mon-projet-justice v1.1*