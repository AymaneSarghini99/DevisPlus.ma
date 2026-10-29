export const common = {
  confirm: "Confirmer",
  leave: "Quitter sans enregistrer",
  save: "Enregistrer",
  cancel: "Annuler",
  delete: "Supprimer",
  edit: "Modifier",
  duplicate: "Dupliquer",
  search: "Rechercher",
  loading: "Chargement…",
  saved: "Enregistré",
  unsaved: "Non enregistré",
  close: "Fermer",
  today: "Aujourd'hui",
  add: "Ajouter",
  remove: "Retirer",
  copy: "Copier",
  language: "Langue",
  printPdf: "PDF / Imprimer",
  downloadPdf: "Télécharger PDF",
  pdfPreparing: "Préparation du PDF…",
  pdfFailed: "Le PDF n'a pas pu être créé. Utilisez « PDF / Imprimer ».",
  printHint: "Choisissez « Enregistrer au format PDF » pour télécharger le fichier",
  viewEdit: "Modifier",
  viewPreview: "Aperçu",
  previewA4: "Aperçu A4 — ce qui sera imprimé ou enregistré en PDF",
  previewA4Short: "Aperçu A4",
  noClient: "Sans client",
  pickDate: "Choisir une date",
  required: "Champ requis",
  example: "Ex. : {{value}}",
  nothingToReport: "Rien à signaler.",
  noMatch: "Aucun résultat pour « {{query}} ».",
  noMatchFilters: "Aucun résultat ne correspond à ces filtres.",
  fixFields: "Corrigez les champs signalés en rouge.",
  unsavedLeave: "Des modifications ne sont pas enregistrées. Quitter quand même ?",
  footer: "© 2026 DevisPlus.ma",
};

export const nav = {
  home: "DevisPlus.ma — accueil",
  main: "Navigation principale",
  dashboard: "Devis",
  invoices: "Factures",
  followups: "Relances",
  clients: "Clients",
  catalogue: "Catalogue",
  reports: "Rapports",
  templates: "Modèles",
  settings: "Paramètres",
  myQuotes: "Mes devis",
  chooseLanguage: "Choisir la langue de l'interface",
};

export const meta = {
  landing: {
    title: "Logiciel de devis et factures pour entreprises au Maroc | DevisPlus.ma",
    description:
      "Créez des devis et factures professionnels en dirhams, avec ICE, IF et TVA, puis envoyez-les en PDF ou sur WhatsApp. DevisPlus.ma, Casablanca.",
  },
  dashboard: {
    title: "Mes devis — DevisPlus.ma",
    description: "Suivez vos devis, leurs montants et leurs statuts.",
  },
  editor: {
    title: "Éditeur de devis — DevisPlus.ma",
    description: "Saisissez client, lignes et conditions ; l'aperçu A4 se met à jour en direct.",
  },
  invoices: {
    title: "Factures — DevisPlus.ma",
    description: "Factures issues de vos devis acceptés, paiements reçus et restes à payer.",
  },
  invoice: {
    title: "Facture — DevisPlus.ma",
    description: "Brouillon de facture, émission et suivi des paiements.",
  },
  followups: {
    title: "Relances — DevisPlus.ma",
    description: "Devis en attente de réponse et devis proches de leur date d'expiration.",
  },
  clients: {
    title: "Clients — DevisPlus.ma",
    description:
      "Fiches clients avec ICE, IF, RC, coordonnées, conditions de paiement et historique des devis.",
  },
  catalogue: {
    title: "Catalogue — DevisPlus.ma",
    description: "Vos produits et services fréquents, à insérer en un clic dans vos devis.",
  },
  reports: {
    title: "Rapports — DevisPlus.ma",
    description:
      "Devis par mois, taux d'acceptation, factures émises, encaissements et exports CSV.",
  },
  templates: {
    title: "Modèles de devis — DevisPlus.ma",
    description: "Choisissez ou créez la mise en page de vos devis.",
  },
  pricing: {
    title: "Tarif : logiciel de devis personnalisé à 2 500 MAD | DevisPlus.ma",
    description:
      "Offre Business : un espace de devis aux couleurs de votre entreprise, configuré pour vous. 2 500 MAD en paiement unique. Demandez votre installation.",
  },
  guides: {
    title: "Guides devis et factures au Maroc : mentions, TVA | DevisPlus.ma",
    description:
      "Guides pratiques pour les entreprises marocaines : mentions obligatoires sur une facture, TVA à 20 % et 10 % en 2026, différences entre devis et facture.",
  },
  group: {
    title: "NEXX Entreprise Group : un groupe, des ambitions différentes | DevisPlus.ma",
    description:
      "DevisPlus.ma fait partie de NEXX Entreprise Group. Découvrez le groupe et ses ambitions.",
  },
  signin: {
    title: "Connexion | DevisPlus.ma",
    description: "Accédez à votre espace DevisPlus.",
  },
  signup: {
    title: "Créer un compte | DevisPlus.ma",
    description: "Créez votre compte DevisPlus gratuitement.",
  },
  share: {
    title: "Votre devis | DevisPlus.ma",
    description: "Consultez le devis et acceptez-le en ligne.",
  },
  waiting: {
    title: "Compte en attente | DevisPlus.ma",
    description: "Votre compte est en cours de validation par l'équipe DevisPlus.",
  },
  password: {
    title: "Mot de passe | DevisPlus.ma",
    description: "Changez ou réinitialisez le mot de passe de votre compte DevisPlus.",
  },
  admin: {
    title: "Administration — DevisPlus.ma",
    description: "Registre des clients et des paiements DevisPlus.",
  },
  onboarding: {
    title: "Configurer votre espace — DevisPlus.ma",
    description:
      "Assistant de configuration de votre espace : profil, logo, identité, devis et domaine.",
  },
  settings: {
    title: "Paramètres — DevisPlus.ma",
    description:
      "Profil de l'entreprise, identifiants fiscaux, coordonnées bancaires et préférences des documents.",
  },
};

export const status = {
  quote: { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" },
  invoice: { brouillon: "Brouillon", emise: "Émise", paid: "Payée", credited: "Annulée (avoir)" },
  all: "Tous les statuts",
};

export const units = {
  pièce: "pièce",
  heure: "heure",
  jour: "jour",
  "m²": "m²",
  "m³": "m³",
  ml: "ml",
  kg: "kg",
  forfait: "forfait",
};

export const kinds = {
  materiel: "Matériaux",
  main_oeuvre: "Main-d'œuvre",
  service: "Prestations",
  other: "Divers",
  unspecified: "Non précisée",
};

export const methods = {
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  carte: "Carte",
  effet: "Effet de commerce",
  autre: "Autre",
};

export const validation = {
  required: "Champ requis",
  ice: "L'ICE comporte 15 chiffres",
  email: "Adresse e-mail invalide",
  phone: "Numéro trop court",
  rib: "Le RIB marocain comporte 24 chiffres",
  companyName: "Indiquez la raison sociale de votre entreprise",
  clientName: "Indiquez le client",
  lines: "Ajoutez au moins une ligne avec une désignation",
  date: "Date requise",
  validUntil: "Doit être postérieure à la date du devis",
  dueDate: "Doit être postérieure à la date de facture",
  exemption: "Une ligne est à 0 % : précisez le motif d'exonération",
  rate: "Taux invalide (0 à 100).",
  vatList: "Gardez au moins un taux",
  vatDefault: "Le taux par défaut doit faire partie de la liste",
  price: "Prix invalide",
  url: "Adresse web invalide",
  passwordShort: "8 caractères minimum",
  passwordMatch: "Les mots de passe ne correspondent pas",
  range: "Valeur hors limites",
  subdomain: "3 à 40 caractères : lettres minuscules, chiffres et tirets",
  reserved: "Cette adresse est réservée, choisissez-en une autre",
  domain: "Nom de domaine invalide (ex. devis.monentreprise.ma)",
  templateName: "Donnez un nom à votre modèle",
};

export const errors = {
  storage:
    "Enregistrement impossible : le stockage du navigateur est plein ou bloqué (logo trop lourd ?).",
  unexpected: "Une erreur inattendue est survenue.",
  quoteNotAccepted: "Seul un devis accepté peut être converti en facture.",
  creditNoteSource: "Un avoir se crée à partir d'une facture émise.",
  creditNoteTooHigh: "L'avoir dépasse le montant restant de la facture d'origine.",
  alreadyIssued: "Cette facture est déjà émise.",
  invoiceClient: "Le nom du client est requis.",
  invoiceLines: "La facture ne contient aucune ligne.",
  trialLimit: "Votre essai gratuit est limité à 10 devis.",
  issuedLocked: "Une facture émise ne peut pas être supprimée.",
  paymentDraft: "Les paiements s'enregistrent sur une facture émise.",
  paymentDate: "Indiquez la date du paiement.",
  paymentAmount: "Le montant doit être supérieur à zéro.",
  paymentTooHigh: "Le montant dépasse le reste à payer.",
  logoFormat: "Format accepté : PNG, JPG, WebP ou SVG.",
  logoSize: "Image trop lourde (5 Mo maximum).",
  logoRead: "Image illisible.",
  onboardingIncomplete: "Certaines étapes ne sont pas complètes.",
  exportFailed: "Export impossible dans ce navigateur.",
  copyFailed: "Copie impossible dans ce navigateur.",
  notFoundTitle: "Page introuvable",
  notFoundText: "La page demandée n'existe pas ou a été déplacée.",
  goHome: "Retour à l'accueil",
  crashTitle: "Cette page n'a pas pu se charger",
  crashText: "Une erreur s'est produite. Réessayez ou revenez à l'accueil.",
  retry: "Réessayer",
};
