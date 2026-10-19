export const account = {
  signupClosed:
    "Les comptes de cet espace sont créés par l'équipe DevisPlus. Si vous avez reçu vos identifiants, connectez-vous.",
  sync: {
    imported: "Les données de ce navigateur ont été transférées dans votre compte en ligne.",
    refused:
      "Une modification n'a pas pu être enregistrée. Rechargez la page pour revoir vos données.",
    retrying: "Connexion perdue : vos modifications seront enregistrées dès son retour.",
    loadFailed: "Impossible de charger votre espace",
    loadFailedText: "Vérifiez votre connexion internet, puis réessayez.",
    retry: "Réessayer",
  },
  waiting: {
    pendingTitle: "Votre compte est en attente de validation",
    pendingText:
      "Merci pour votre inscription. L'équipe DevisPlus vérifie votre demande et active votre espace rapidement. Vous pouvez nous contacter pour accélérer la validation.",
    rejectedTitle: "Votre demande n'a pas été acceptée",
    rejectedText: "Contactez l'équipe DevisPlus si vous pensez qu'il s'agit d'une erreur.",
    suspendedTitle: "Votre espace est suspendu",
    suspendedText:
      "Vos données sont conservées. Contactez l'équipe DevisPlus pour réactiver votre espace.",
    signedInAs: "Connecté en tant que",
    contactSubject: "Validation de mon compte DevisPlus",
    contactMessage: "Bonjour, je souhaite la validation de mon compte DevisPlus :",
    email: "Écrire un e-mail",
    check: "Vérifier à nouveau",
  },
  admin: {
    signedInAs: "Connecté en tant que {{email}}",
    tab: { accounts: "Inscriptions", register: "Registre clients" },
    title: "Comptes inscrits",
    mode: {
      approval:
        "Chaque nouvelle inscription attend votre validation avant d'accéder à l'application.",
      open: "Les inscriptions sont acceptées automatiquement (SIGNUP_MODE=open).",
      closed: "Inscriptions fermées : vous créez vous-même les comptes de vos clients.",
    },
    create: "Créer un compte client",
    kpi: { all: "Tous" },
    status: {
      pending: "En attente",
      approved: "Validé",
      rejected: "Refusé",
      suspended: "Suspendu",
    },
    allStatuses: "Tous les statuts",
    search: "Rechercher : entreprise, nom, e-mail, téléphone, domaine",
    col: {
      account: "Compte",
      joined: "Inscrit le",
      lastSeen: "Dernière visite",
      setup: "Configuration",
      domain: "Adresse",
      status: "Statut",
      actions: "Actions",
    },
    emptyTitle: "Aucune inscription pour l'instant",
    emptyText:
      "Les entreprises qui créent un compte apparaissent ici. Vous pouvez aussi créer un compte pour un client.",
    method: { password: "E-mail" },
    isAdmin: "Admin",
    setupDone: "Terminée",
    setupTodo: "Pas encore",
    requested: "Demandée",
    action: {
      approve: "Valider",
      reject: "Refuser",
      suspend: "Suspendre",
      domainActivate: "Activer le domaine",
      domainRefresh: "Vérifier",
      domainRemove: "Retirer",
    },
    confirm: {
      reject: "Refuser l'inscription de {{name}} ?",
      rejectText:
        "La personne ne pourra pas utiliser l'application. Vous pourrez la valider plus tard.",
      suspend: "Suspendre l'espace de {{name}} ?",
      suspendText:
        "L'accès est bloqué tout de suite ; les données sont conservées et l'espace peut être réactivé.",
      domainRemove: "Retirer le domaine {{domain}} ?",
    },
    done: {
      approve: "{{name}} est validé.",
      reject: "{{name}} est refusé.",
      suspend: "{{name}} est suspendu.",
    },
    error: {
      failed: "L'opération a échoué. Réessayez.",
      not_found: "Ce compte n'existe plus.",
      email: "Adresse e-mail invalide.",
      password: "Le mot de passe doit contenir au moins 8 caractères.",
      exists: "Un compte existe déjà avec cette adresse e-mail.",
      hostname: "Ce nom de domaine n'est pas valide.",
      hostname_taken: "Ce domaine est déjà utilisé par une autre entreprise.",
      domains_off: "Les domaines personnalisés ne sont pas configurés (Cloudflare).",
      cloudflare: "Cloudflare a refusé la demande :",
    },
    copy: "Copier",
    copied: "Copié",
    createTitle: "Créer un compte client",
    createText:
      "Le compte est validé tout de suite. Transmettez les identifiants à votre client ; il pourra se connecter et configurer son espace.",
    createdText: "Compte créé. Ces identifiants ne seront plus affichés : copiez-les maintenant.",
    signInAt: "Adresse de connexion",
    form: {
      company: "Entreprise",
      name: "Nom du contact",
      email: "E-mail de connexion *",
      password: "Mot de passe provisoire *",
      passwordHint: "8 caractères au moins. Généré au hasard ; vous pouvez le modifier.",
      newPassword: "Générer un autre mot de passe",
      submit: "Créer le compte",
    },
    domainState: { pending: "en cours de vérification", active: "actif", failed: "en échec" },
    dnsText:
      "Votre client ajoute ces enregistrements chez son fournisseur de domaine. Le certificat SSL est émis automatiquement ; cliquez sur « Vérifier » pour suivre l'activation.",
    gate: {
      signinTitle: "Portail administrateur",
      signinText: "Connectez-vous avec le compte administrateur DevisPlus.",
      deniedTitle: "Accès réservé",
      deniedText:
        "Le compte {{email}} n'est pas administrateur. Déconnectez-vous puis connectez-vous avec le compte administrateur.",
      errorTitle: "Impossible de charger le portail",
      errorText: "Vérifiez votre connexion internet, puis réessayez.",
    },
  },
  docs: {
    title: "Numérotation et pied de page",
    text: "S'applique aux nouveaux devis et factures ; les documents existants gardent leur numéro.",
    quotePrefix: "Préfixe des devis",
    invoicePrefix: "Préfixe des factures",
    pattern: "Format du numéro",
    digits: "Chiffres du compteur",
    preview: "Prochains numéros : {{quote}} et {{invoice}}",
    patternHint:
      "Avec l'année dans le format, le compteur repart à 1 chaque année ; sans l'année, il continue.",
    footer: "Pied de page par défaut",
    footerHint:
      "Imprimé en bas de chaque nouveau document (garantie, assurance, horaires…). Un modèle personnalisé peut le remplacer.",
    invalidPrefix: "Lettres, chiffres et tirets uniquement (8 caractères au plus).",
    samePrefix: "Les devis et les factures doivent avoir des préfixes différents.",
  },
};
