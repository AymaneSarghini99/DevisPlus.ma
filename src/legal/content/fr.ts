import type { LegalContent } from "./types";

// Projet de textes — non validé juridiquement. Chaque section marquée `review` doit être
// relue par un professionnel du droit marocain avant publication.
export const fr: LegalContent = {
  terms: {
    title: "Conditions générales d'utilisation",
    summary:
      "Règles d'utilisation de la plateforme DevisPlus.ma, logiciel de devis et de factures destiné aux entreprises.",
    sections: [
      {
        id: "acceptance",
        title: "Objet et acceptation",
        body: [
          "Les présentes conditions encadrent l'utilisation du logiciel DevisPlus.ma (la « plateforme »). En utilisant la plateforme, vous déclarez les avoir lues et acceptées.",
          "Elles ne remplacent pas un contrat séparé de personnalisation, de mise en place ou de maintenance signé avec l'exploitant : en cas de contradiction, ce contrat séparé prévaut pour les prestations qu'il décrit.",
        ],
        review:
          "Mode d'acceptation (simple usage ou case à cocher) et articulation avec les contrats séparés.",
      },
      {
        id: "operator",
        title: "Exploitant et contact",
        body: [
          "La plateforme est exploitée par {{legalName}} ({{legalForm}}), dont le siège est situé {{address}}, immatriculée au registre de commerce sous le n° {{rc}}, ICE {{ice}}, IF {{if_}}.",
          "Contact : {{email}} — {{phone}}.",
        ],
      },
      {
        id: "service",
        title: "Description du service",
        body: [
          "La plateforme permet de créer des devis, des factures, des fiches clients et un catalogue de produits et services, de suivre les relances et d'exporter ses données au format CSV.",
          "Dans sa version actuelle, toutes ces données sont enregistrées uniquement dans le navigateur de l'appareil utilisé (stockage local). Elles ne sont pas transmises aux serveurs de l'exploitant, ne sont pas synchronisées entre appareils et ne font l'objet d'aucune sauvegarde par l'exploitant.",
          "La plateforme ne propose pas, à ce jour, de compte utilisateur, de paiement en ligne, d'envoi d'e-mails ni de nom de domaine personnalisé. Si ces fonctions sont ajoutées, les présentes conditions seront mises à jour avant leur mise en service.",
        ],
      },
      {
        id: "eligibility",
        title: "Utilisateurs et pouvoir d'engager l'entreprise",
        body: [
          "La plateforme est destinée aux professionnels. La personne qui l'utilise au nom d'une entreprise déclare être autorisée à le faire et à engager cette entreprise.",
        ],
        review:
          "Statut des utilisateurs (professionnels uniquement ?) et effets sur le droit de la consommation.",
      },
      {
        id: "accounts",
        title: "Comptes et sécurité",
        body: [
          "Aucun compte n'existe actuellement. L'accès aux données dépend de l'accès à l'appareil et au navigateur : il vous appartient de protéger cet appareil (session, mot de passe, verrouillage) et de ne pas laisser un tiers l'utiliser.",
        ],
      },
      {
        id: "responsibilities",
        title: "Vos responsabilités",
        body: [
          {
            list: [
              "fournir des informations exactes sur votre entreprise (raison sociale, ICE, IF, RC, TP, coordonnées) ;",
              "vérifier chaque devis et chaque facture avant envoi : montants, taux de TVA, mentions obligatoires, motifs d'exonération ;",
              "respecter la réglementation qui s'applique à vos clients, à vos documents commerciaux et à votre activité ;",
              "disposer des droits sur les logos, textes et fichiers que vous importez ;",
              "conserver vos propres copies (exports CSV, PDF) de vos documents.",
            ],
          },
          "Les calculs et les modèles sont fournis comme outils : ils ne constituent ni un conseil fiscal ni une garantie de conformité de vos documents.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Utilisation acceptable",
        body: [
          "Vous vous engagez à respecter la politique d'utilisation acceptable, notamment à ne pas utiliser la plateforme pour émettre des documents trompeurs ou frauduleux.",
        ],
      },
      {
        id: "data-ownership",
        title: "Vos données et votre marque",
        body: [
          "Les informations de votre entreprise, votre logo, vos clients, vos devis et vos factures restent votre propriété. L'exploitant n'y a pas accès dans la version actuelle, puisqu'ils restent sur votre appareil.",
        ],
      },
      {
        id: "ip",
        title: "Propriété intellectuelle de DevisPlus",
        body: [
          "Le logiciel, son code, ses modèles de documents et la marque DevisPlus.ma appartiennent à l'exploitant ou à ses concédants. L'achat d'une version personnalisée n'emporte pas transfert de la propriété du logiciel sous-jacent, sauf stipulation contraire d'un contrat séparé.",
        ],
        review: "Étendue de la licence accordée et cas des contrats « sur mesure ».",
      },
      {
        id: "third-parties",
        title: "Services de tiers",
        body: [
          "La plateforme charge des polices de caractères depuis Google Fonts et permet d'ouvrir WhatsApp pour préparer un message. Ces services sont fournis par des tiers selon leurs propres conditions ; l'exploitant n'en contrôle ni la disponibilité ni le fonctionnement.",
        ],
      },
      {
        id: "availability",
        title: "Disponibilité, maintenance et évolutions",
        body: [
          "L'exploitant s'efforce de maintenir le site accessible, sans garantie de disponibilité permanente. Des interruptions peuvent être nécessaires pour la maintenance. Les fonctions peuvent évoluer ; une évolution qui réduirait substantiellement un service payé fera l'objet d'une information préalable.",
          "Les données étant stockées dans votre navigateur, leur effacement (nettoyage du navigateur, navigation privée, changement d'appareil) entraîne leur perte. Exportez-les régulièrement.",
        ],
      },
      {
        id: "termination",
        title: "Suspension et fin d'utilisation",
        body: [
          "Vous pouvez cesser d'utiliser la plateforme à tout moment ; vos données restent sur votre appareil jusqu'à ce que vous les supprimiez. En cas de manquement grave aux présentes conditions, l'exploitant peut limiter l'accès au service, après information sauf urgence ou obligation légale.",
        ],
        review: "Conditions et procédure de suspension, notamment pour les clients ayant payé.",
      },
      {
        id: "liability",
        title: "Responsabilité",
        body: [
          "L'exploitant répond des dommages directs causés par un manquement prouvé à ses obligations, dans les limites permises par la loi applicable. Il ne peut être tenu responsable du contenu des documents que vous établissez, ni d'une perte de données stockées sur votre appareil.",
          "Aucune stipulation ne limite les droits que la loi accorde de manière impérative.",
        ],
        review:
          "Validité et formulation des limitations de responsabilité en droit marocain (DOC, loi 31-08).",
      },
      {
        id: "law",
        title: "Droit applicable et litiges",
        body: [
          "Les présentes conditions sont soumises au droit marocain. En cas de différend, les parties recherchent d'abord une solution amiable en écrivant à {{email}}. À défaut, le litige est porté devant {{court}}.",
        ],
        review: "Juridiction compétente et éventuelle médiation, à fixer avec un conseil.",
      },
      {
        id: "changes",
        title: "Modification des conditions",
        body: [
          "Chaque version porte un numéro et une date. Une modification substantielle sera signalée sur le site avant son entrée en vigueur ; les versions antérieures restent consultables sur demande.",
        ],
      },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    summary:
      "Quelles données DevisPlus.ma collecte, pourquoi, où elles sont conservées, ce que nous faisons des données de votre compte Google, et comment exercer vos droits.",
    sections: [
      {
        id: "controller",
        title: "Responsable du traitement",
        body: [
          "Le responsable des traitements décrits ici est {{legalName}}, {{address}}. Pour toute question sur vos données personnelles, écrivez à {{email}}.",
        ],
      },
      {
        id: "data",
        title: "Données que nous collectons",
        body: [
          {
            list: [
              "Compte : votre adresse e-mail, votre nom et votre mot de passe (conservé uniquement sous forme chiffrée, jamais en clair). Si vous vous connectez avec Google : votre nom, votre adresse e-mail, votre photo de profil et l'identifiant de votre compte Google.",
              "Espace de votre entreprise : les informations de votre entreprise (nom, ICE, IF, RC, adresse, coordonnées bancaires, logo), vos réglages, et ce que vous saisissez : clients, catalogue, devis, factures, avoirs, bons de livraison et paiements.",
              "Acceptation en ligne : quand votre client accepte un devis par son lien, le nom qu'il saisit et la date d'acceptation.",
              "Données techniques : adresse IP, navigateur, dates et pages demandées (journaux techniques de l'hébergeur), et les cookies décrits plus bas.",
              "Échanges avec nous : les messages que vous nous envoyez (e-mail, WhatsApp).",
            ],
          },
          "Les données de vos propres clients sont saisies par votre entreprise, qui décide de leur usage : voir la page « Traitement des données et responsabilités ».",
        ],
      },
      {
        id: "google",
        title: "Données de votre compte Google",
        body: [
          "DevisPlus.ma utilise les services Google uniquement si vous le choisissez, pour deux fonctions :",
          {
            list: [
              "Connexion avec Google : nous recevons votre nom, votre adresse e-mail, votre photo de profil et l'identifiant de votre compte Google (autorisations « openid », « email » et « profile »), pour créer votre compte et vous connecter.",
              "Enregistrement dans Google Drive : si vous connectez Google Drive dans les Paramètres, nous demandons uniquement l'autorisation « drive.file ». Elle permet à DevisPlus.ma de créer un dossier dans votre Drive et d'y enregistrer les PDF de vos devis et factures, puis de mettre à jour ces mêmes fichiers. DevisPlus.ma n'a accès qu'aux fichiers qu'il a lui-même créés : il ne peut ni voir, ni lire, ni modifier, ni supprimer vos autres fichiers Google Drive.",
            ],
          },
          "Les jetons d'accès Google sont conservés sur nos serveurs, chiffrés, et ne servent qu'à ces deux fonctions. Nous ne vendons pas vos données Google, nous ne les utilisons pas pour de la publicité, nous ne les transmettons à personne d'autre et nous ne les utilisons pas pour entraîner des modèles d'intelligence artificielle. Aucune personne de notre équipe ne lit le contenu de votre Drive.",
          "L'utilisation et le transfert à toute autre application des informations reçues des API Google par DevisPlus.ma respectent la politique « Google API Services User Data Policy », y compris les exigences d'utilisation limitée (Limited Use).",
          "Vous pouvez déconnecter Google Drive à tout moment dans Paramètres → Google Drive, et retirer l'accès de DevisPlus.ma depuis votre compte Google (myaccount.google.com/permissions). Les jetons sont alors supprimés de nos serveurs ; les PDF déjà enregistrés restent dans votre Drive, à vous.",
        ],
      },
      {
        id: "purposes",
        title: "Pourquoi nous utilisons ces données",
        body: [
          {
            list: [
              "fournir le service : votre compte, votre espace, vos documents, leur numérotation et leur enregistrement (exécution du contrat) ;",
              "permettre à vos clients de consulter et d'accepter un devis par son lien (exécution du contrat) ;",
              "valider les inscriptions, gérer votre abonnement et vous assister (exécution du contrat) ;",
              "assurer la sécurité et le bon fonctionnement du service (intérêt légitime) ;",
              "respecter nos obligations légales.",
            ],
          },
          "Nous ne faisons aucune publicité, aucune revente de données et aucun profilage commercial.",
        ],
      },
      {
        id: "storage",
        title: "Où sont conservées vos données",
        body: [
          "Vos données sont enregistrées sur nos serveurs, et non plus seulement dans votre navigateur :",
          {
            list: [
              "le site est hébergé par Cloudflare, Inc. (Cloudflare Workers), sur son réseau de serveurs dans le monde ;",
              "la base de données est hébergée par Neon, Inc., sur des serveurs situés à Francfort (Allemagne, Union européenne).",
            ],
          },
          "Les échanges avec le site sont chiffrés (HTTPS). Chaque entreprise n'accède qu'à ses propres données : la base de données l'impose elle-même.",
        ],
      },
      {
        id: "recipients",
        title: "Qui reçoit vos données",
        body: [
          "Vos données ne sont accessibles qu'à vous, aux membres de votre entreprise et, pour l'assistance et la validation des comptes, à l'équipe DevisPlus.ma. Elles sont aussi traitées par nos prestataires techniques, uniquement pour faire fonctionner le service :",
          {
            list: [
              "Cloudflare (hébergement du site) et Neon (base de données) ;",
              "Google, si vous utilisez la connexion avec Google ou Google Drive, et pour les polices de caractères du site (Google Fonts, qui reçoit votre adresse IP) ;",
              "WhatsApp (Meta), seulement quand vous cliquez sur un bouton WhatsApp : le texte du message et le numéro choisi sont transmis pour ouvrir la conversation.",
            ],
          },
          "Nous ne vendons ni ne louons vos données.",
        ],
      },
      {
        id: "transfers",
        title: "Transferts hors du Maroc",
        body: [
          "Nos prestataires traitent des données hors du Maroc, notamment dans l'Union européenne et aux États-Unis. Ces transferts sont limités à ce qui est nécessaire au service, conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
        ],
      },
      {
        id: "retention",
        title: "Durées de conservation",
        body: [
          {
            list: [
              "Compte et espace : tant que votre compte est actif. À votre demande, votre compte et toutes les données de votre espace sont effacés.",
              "Factures et avoirs émis : votre entreprise doit les conserver pendant la durée prévue par la loi ; exportez-les avant de demander l'effacement de votre compte.",
              "Jetons Google : jusqu'à ce que vous déconnectiez Google Drive ou retiriez l'accès.",
              "Session de connexion : 30 jours au plus ; cookie de langue : 12 mois.",
              "Journaux techniques : selon les durées de l'hébergeur.",
            ],
          },
        ],
      },
      {
        id: "cookies",
        title: "Cookies",
        body: [
          "Nous utilisons seulement des cookies nécessaires : un cookie de session pour rester connecté et un cookie qui retient votre langue. Aucun cookie publicitaire, aucun outil de mesure d'audience.",
        ],
      },
      {
        id: "rights",
        title: "Vos droits",
        body: [
          "Conformément à la loi 09-08, vous pouvez demander l'accès à vos données, leur rectification, leur effacement, et vous opposer à leur traitement pour un motif légitime. Vous pouvez aussi exporter vos données vous-même (page Rapports) et déconnecter Google Drive à tout moment.",
          "Écrivez à {{email}} : nous répondons dans un délai d'un mois au plus. Vous pouvez également saisir la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP, www.cndp.ma).",
        ],
      },
      {
        id: "updates",
        title: "Mises à jour",
        body: [
          "Nous mettrons cette politique à jour si nos traitements changent. La version et la date figurent en tête de page ; en cas de changement important, nous vous en informerons dans l'application.",
        ],
      },
    ],
  },
  cookies: {
    title: "Politique relative aux cookies",
    summary: "Les cookies et le stockage local réellement utilisés par DevisPlus.ma.",
    sections: [
      {
        id: "what",
        title: "Qu'est-ce qu'un cookie ?",
        body: [
          "Un cookie est un petit fichier déposé par un site dans votre navigateur. Le « stockage local » est un mécanisme voisin qui permet à un site d'enregistrer des informations sur votre appareil.",
        ],
      },
      {
        id: "used",
        title: "Ce que DevisPlus.ma utilise",
        body: [
          {
            list: [
              "Cookie « devisplus.lang » : mémorise la langue de l'interface (français, anglais ou arabe). Durée : 12 mois. Nécessaire pour afficher le site dans la langue choisie.",
              "Stockage local « devisplus.quotes », « devisplus.invoices », « devisplus.clients », « devisplus.catalog », « devisplus.settings » : contient vos devis, factures, clients, catalogue et paramètres. C'est le fonctionnement même de l'application : sans lui, rien ne serait enregistré.",
            ],
          },
          "Aucun cookie de mesure d'audience, de publicité ou de réseau social n'est utilisé.",
        ],
      },
      {
        id: "third-party",
        title: "Requêtes vers des tiers",
        body: [
          "Les polices de caractères sont chargées depuis Google Fonts : ce n'est pas un cookie, mais Google reçoit votre adresse IP lors du chargement.",
        ],
      },
      {
        id: "consent",
        title: "Pourquoi il n'y a pas de bandeau de consentement",
        body: [
          "Le site n'utilisant que le cookie de langue et le stockage nécessaire au service, il n'affiche pas de bandeau proposant d'accepter ou de refuser des traceurs facultatifs : il n'y en a pas. Si des traceurs facultatifs sont un jour ajoutés, ils ne seront activés qu'après votre accord.",
        ],
        review:
          "Confirmer qu'aucun recueil de consentement n'est requis pour ces usages au regard du droit marocain.",
      },
      {
        id: "manage",
        title: "Gérer ou supprimer",
        body: [
          "Vous pouvez supprimer le cookie et le stockage local depuis les réglages de votre navigateur (données de site). Attention : supprimer le stockage local efface définitivement vos devis, factures et clients enregistrés sur cet appareil. Exportez-les d'abord depuis la page Rapports.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: ["Pour toute question : {{email}}."],
      },
    ],
  },

  refunds: {
    title: "Conditions de remboursement et d'annulation",
    summary:
      "Ce qui est acheté, comment la livraison est constatée, et comment demander une annulation ou un remboursement.",
    sections: [
      {
        id: "scope",
        title: "Ce que couvre cette page",
        body: [
          "L'exploitant peut proposer l'achat d'une version personnalisée de DevisPlus pour une entreprise. Ces conditions décrivent les principes applicables ; le devis ou le contrat signé pour chaque commande précise le prix, le contenu et les délais. La plateforme ne propose pas de paiement en ligne à ce jour.",
        ],
        review:
          "Toute cette page dépend de l'offre commerciale réelle, à arrêter avant publication.",
      },
      {
        id: "items",
        title: "Les éléments qui peuvent être achetés",
        body: [
          {
            list: [
              "un droit d'utilisation du logiciel (licence), unique ou périodique selon l'offre ;",
              "des prestations de mise en place : personnalisation de la marque, modèles, configuration ;",
              "l'aide à la configuration d'un nom de domaine, le nom de domaine restant enregistré au nom du client auprès de son registraire ;",
              "le cas échéant, l'hébergement et la maintenance, qui sont des services continus et payés séparément ;",
              "des frais de tiers (nom de domaine, services externes) refacturés au coût.",
            ],
          },
          "Un achat « unique » ou « à vie » ne vaut pas engagement d'hébergement, de support ou de disponibilité illimités, sauf si le contrat le prévoit expressément.",
        ],
      },
      {
        id: "delivery",
        title: "Livraison et réception",
        body: [
          "La livraison des prestations de mise en place est constatée lorsque la version personnalisée est accessible au client et conforme au devis signé. Le client dispose d'un délai de {{acceptanceDelay}} pour signaler une anomalie.",
        ],
        review: "Délai de réception et procédure de recette à définir.",
      },
      {
        id: "issues",
        title: "Problèmes de mise en place, défauts et retards",
        body: [
          "En cas de défaut ou de retard, écrivez à {{email}} en décrivant le problème. L'exploitant corrige ce qui relève de ses engagements. Si la prestation ne peut pas être livrée conformément au devis, les sommes correspondant à la partie non livrée sont remboursées.",
        ],
      },
      {
        id: "withdrawal",
        title: "Droit de rétractation",
        body: [
          "Lorsque l'achat est conclu à distance par un consommateur, la loi 31-08 édictant des mesures de protection du consommateur prévoit un droit de rétractation dans les conditions qu'elle fixe. Ces droits légaux ne sont pas limités par la présente page.",
        ],
        review:
          "Applicabilité de la loi 31-08 (achats entre professionnels ?) et texte exact de l'article 36 à vérifier au Bulletin officiel.",
      },
      {
        id: "request",
        title: "Demander une annulation ou un remboursement",
        body: [
          "Envoyez votre demande à {{email}} avec le numéro de la commande ou du devis et le motif. L'exploitant accuse réception et répond par écrit. Les remboursements acceptés sont effectués par le moyen de paiement utilisé ou par virement, dans un délai de {{refundDelay}}.",
        ],
        review: "Délai de traitement des remboursements à fixer.",
      },
      {
        id: "third-party-costs",
        title: "Frais de tiers et services continus",
        body: [
          "Les frais déjà payés à des tiers pour le compte du client (par exemple l'enregistrement d'un nom de domaine) ne peuvent généralement pas être récupérés auprès de ces tiers ; leur traitement est précisé dans le devis, sous réserve des droits légaux du client. L'annulation d'un service d'hébergement ou de maintenance prend effet à la fin de la période en cours, sauf disposition contraire du contrat.",
        ],
        review: "Traitement des frais non récupérables au regard du droit applicable.",
      },
    ],
  },

  "acceptable-use": {
    title: "Politique d'utilisation acceptable",
    summary: "Ce qui est interdit sur DevisPlus.ma, et comment signaler un abus.",
    sections: [
      {
        id: "prohibited",
        title: "Usages interdits",
        body: [
          {
            list: [
              "toute activité illégale ;",
              "établir des devis ou factures faux, trompeurs ou destinés à une fraude (fausse identité, faux ICE, montants fictifs, usurpation d'une entreprise) ;",
              "importer des logos, marques ou contenus sans en avoir le droit ;",
              "tenter d'accéder sans autorisation au site, à ses serveurs ou aux données d'un autre utilisateur, ou de contourner une protection ;",
              "introduire des logiciels malveillants, perturber le service ou l'attaquer (déni de service, injection, exploration automatisée abusive) ;",
              "utiliser les fonctions de message pour envoyer des messages non sollicités ou illicites ;",
              "utiliser un nom de domaine personnalisé pour tromper le public ou porter atteinte aux droits d'un tiers.",
            ],
          },
        ],
      },
      {
        id: "report",
        title: "Signaler un abus ou une faille",
        body: [
          "Écrivez à {{email}} en décrivant le problème. Pour une faille de sécurité, n'exploitez pas la vulnérabilité au-delà de ce qui est nécessaire pour la démontrer et ne divulguez pas de données ; l'exploitant vous répondra.",
        ],
      },
      {
        id: "measures",
        title: "Mesures et recours",
        body: [
          "En cas d'abus avéré, l'exploitant peut, de manière proportionnée, avertir l'utilisateur, limiter ou suspendre l'accès au service et, si la loi l'exige, informer les autorités. Sauf urgence, l'utilisateur est informé du motif et peut présenter ses observations à {{email}}.",
        ],
        review: "Procédure de suspension et de recours à valider.",
      },
    ],
  },

  "data-processing": {
    title: "Traitement des données et responsabilités",
    summary:
      "Le rôle de DevisPlus.ma et celui de votre entreprise pour les données que vous enregistrez sur vos clients.",
    sections: [
      {
        id: "roles",
        title: "Qui est responsable de quoi",
        body: [
          "Lorsque vous enregistrez des informations sur vos clients (noms, contacts, ICE, adresses, devis, factures, paiements), votre entreprise décide pourquoi et comment ces données sont utilisées : elle en est responsable au sens de la loi 09-08.",
          "Dans la version actuelle, ces données restent dans votre navigateur et ne sont pas transmises à l'exploitant. Celui-ci n'agit donc pas, pour elles, en tant que sous-traitant hébergeur. Si un stockage en ligne est ajouté, un accord de traitement des données sera proposé avant sa mise en service.",
        ],
        review:
          "Qualification des rôles et nécessité d'un accord de sous-traitance si un stockage en ligne est ajouté.",
      },
      {
        id: "purposes",
        title: "Finalités autorisées",
        body: [
          "La plateforme est prévue pour établir des devis et des factures, suivre les paiements et relancer vos clients. N'y enregistrez que les données nécessaires à ces finalités, et aucune donnée sensible.",
        ],
      },
      {
        id: "your-duties",
        title: "Vos obligations envers vos clients",
        body: [
          {
            list: [
              "informer vos clients du traitement de leurs données ;",
              "effectuer, le cas échéant, les formalités auprès de la CNDP pour vos propres traitements ;",
              "répondre aux demandes d'accès, de rectification ou d'opposition de vos clients — vous pouvez modifier ou supprimer leurs fiches à tout moment ;",
              "protéger l'appareil sur lequel les données sont stockées et en limiter l'accès aux personnes autorisées.",
            ],
          },
        ],
        review: "Obligations exactes de l'entreprise cliente au regard de la loi 09-08.",
      },
      {
        id: "security",
        title: "Sécurité et confidentialité",
        body: [
          "Les données ne quittent votre appareil que si vous les exportez, les imprimez ou les partagez (par exemple via WhatsApp). Les fichiers exportés (CSV, PDF) doivent être conservés de manière sécurisée.",
        ],
      },
      {
        id: "subprocessors",
        title: "Prestataires",
        body: [
          "Aucun prestataire de l'exploitant ne reçoit les données de vos clients dans la version actuelle. Lorsque vous utilisez WhatsApp, vous choisissez de transmettre le message et le numéro du client à ce service.",
        ],
      },
      {
        id: "export-deletion",
        title: "Export et suppression",
        body: [
          "Vous pouvez exporter vos clients, devis, factures et paiements depuis la page Rapports, et supprimer chaque élément depuis l'application. La suppression des données du site dans votre navigateur efface tout.",
        ],
      },
      {
        id: "incidents",
        title: "Incidents de sécurité",
        body: [
          "Si l'exploitant a connaissance d'une faille du logiciel susceptible d'exposer des données, il en informe les utilisateurs sur le site et par les moyens de contact dont il dispose, dans les meilleurs délais.",
        ],
        review: "Délais et modalités de notification des incidents à préciser.",
      },
      {
        id: "contact",
        title: "Coopération et contact",
        body: ["Pour toute question sur ces responsabilités : {{email}}."],
      },
    ],
  },
};
