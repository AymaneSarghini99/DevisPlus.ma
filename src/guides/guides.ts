/**
 * Practical guides (French, the language of the Moroccan market and of the indexed site).
 *
 * Editorial rules: answer first, facts only with a source, no legal or tax advice. Every guide
 * lists its sources and its last update; check them again when a finance law changes VAT or
 * invoicing rules, and update `updated`.
 */
export type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][]; caption?: string }
  | { type: "note"; text: string };

export type Guide = {
  slug: string;
  /** <title> */
  title: string;
  h1: string;
  description: string;
  /** Direct answer, shown first. */
  lead: string;
  published: string;
  updated: string;
  readingMinutes: number;
  sections: { h2: string; blocks: Block[] }[];
  sources: { label: string; url: string }[];
  related: string[];
};

const DISCLAIMER =
  "Ce guide est informatif et ne remplace pas l'avis d'un comptable ou d'un conseiller fiscal. Les règles évoluent avec chaque loi de finances : vérifiez votre situation auprès de votre comptable ou de la Direction générale des impôts.";

export const GUIDES: Guide[] = [
  {
    slug: "mentions-obligatoires-facture-maroc",
    title: "Mentions obligatoires sur une facture au Maroc (2026) | DevisPlus.ma",
    h1: "Mentions obligatoires sur une facture au Maroc",
    description:
      "ICE, IF, RC, taxe professionnelle, numérotation continue, TVA par taux : la liste des mentions à faire figurer sur une facture au Maroc, et ce qu'il faut reprendre sur un devis.",
    lead: "Au Maroc, une facture doit être numérotée dans une série continue et indiquer l'identité et l'adresse du vendeur et du client, le détail des biens ou services, les montants hors taxes, la TVA par taux et le total TTC. Le vendeur y porte ses identifiants (ICE, identifiant fiscal, taxe professionnelle, registre du commerce pour les commerçants) et, pour un client professionnel, l'ICE du client. Ces obligations découlent principalement de l'article 145 du Code général des impôts (CGI).",
    published: "2026-10-18",
    updated: "2026-10-18",
    readingMinutes: 5,
    sections: [
      {
        h2: "La liste des mentions à vérifier",
        blocks: [
          {
            type: "table",
            caption: "Mentions habituellement exigées sur une facture au Maroc",
            head: ["Mention", "Ce qu'il faut indiquer"],
            rows: [
              ["Numéro", "Un numéro unique, dans une série continue et chronologique, sans saut."],
              ["Date", "La date d'émission de la facture."],
              ["Vendeur", "Nom ou raison sociale et adresse."],
              [
                "Identifiants du vendeur",
                "ICE (15 chiffres), identifiant fiscal (IF), numéro de taxe professionnelle (TP), et registre du commerce (RC) avec la ville pour les commerçants.",
              ],
              [
                "Client",
                "Nom ou raison sociale et adresse ; l'ICE du client lorsqu'il s'agit d'une entreprise.",
              ],
              [
                "Détail",
                "Désignation des biens ou services, quantités et prix unitaires hors taxes.",
              ],
              ["Montants", "Montant hors taxes, taux et montant de la TVA par taux, total TTC."],
              ["Paiement", "Le mode de paiement et ses références."],
            ],
          },
          {
            type: "p",
            text: "Les sources consultées ne présentent pas toutes cette liste de la même manière, notamment pour le mode de paiement. La version du CGI en vigueur, publiée par la Direction générale des impôts, fait foi.",
          },
        ],
      },
      {
        h2: "L'ICE du vendeur et l'ICE du client",
        blocks: [
          {
            type: "p",
            text: "L'identifiant commun de l'entreprise (ICE) compte 15 chiffres. La loi de finances 2016 a ajouté au paragraphe VIII de l'article 145 du CGI l'obligation de le faire figurer sur les factures et les documents remis aux clients, pour les documents délivrés à partir du 1er janvier 2016.",
          },
          {
            type: "p",
            text: "Pour une vente entre entreprises, plusieurs sources indiquent que l'ICE du client doit aussi figurer sur la facture depuis 2019. Une omission ou une erreur d'ICE est sanctionnée par une amende prévue à l'article 198 ter du CGI (100 dirhams par omission ou erreur selon ces sources), et le client risque de ne pas pouvoir déduire la TVA de la facture.",
          },
        ],
      },
      {
        h2: "La numérotation : une série continue, sans trou",
        blocks: [
          {
            type: "p",
            text: "Les factures doivent être prénumérotées et tirées d'une série continue, ou éditées par un système informatique selon une série continue. En pratique :",
          },
          {
            type: "ul",
            items: [
              "chaque numéro n'est utilisé qu'une seule fois ;",
              "on ne supprime pas une facture émise : on l'annule par un avoir ;",
              "un numéro manquant dans la série peut être interprété comme une vente non déclarée lors d'un contrôle.",
            ],
          },
        ],
      },
      {
        h2: "Et sur un devis ?",
        blocks: [
          {
            type: "p",
            text: "Le CGI ne fixe pas de liste de mentions propre au devis : c'est une proposition commerciale, qui n'a pas de valeur comptable. En pratique, reprenez les mêmes informations que sur la facture (vos identifiants, le détail, la TVA par taux et le total TTC), puis ajoutez :",
          },
          {
            type: "ul",
            items: [
              "la date de validité de l'offre ;",
              "les conditions de paiement (acompte, solde, mode de paiement) ;",
              "le délai ou la date de réalisation ;",
              "un espace « Bon pour accord » daté et signé par le client.",
            ],
          },
          {
            type: "p",
            text: "Ainsi, la facture finale reprend fidèlement le devis accepté, sans écart sur les montants ni sur les identifiants.",
          },
        ],
      },
      {
        h2: "Comment DevisPlus vous aide",
        blocks: [
          {
            type: "p",
            text: "Dans DevisPlus, vos ICE, IF, RC et TP sont saisis une fois dans les paramètres et repris sur chaque devis et chaque facture. L'ICE du client a son propre champ, la numérotation est automatique et sans doublon (DV-2026-001 pour les devis, FA-2026-001 pour les factures), et la TVA est détaillée par taux. Une facture émise est verrouillée : elle ne peut plus être modifiée.",
          },
          { type: "note", text: DISCLAIMER },
        ],
      },
    ],
    sources: [
      {
        label: "Direction générale des impôts : Code général des impôts",
        url: "https://www.tax.gov.ma",
      },
      {
        label: "CMS : mesures communes de la loi de finances 2016 (ICE sur les factures)",
        url: "https://cms.law/fr/mar/legal-updates/Maroc-Mesures-communes-de-la-loi-de-Finances-pour-2016",
      },
      {
        label: "La Vie Éco : l'article 145 du CGI et les factures",
        url: "https://www.lavieeco.com/?p=206098",
      },
      {
        label: "AMDE : les mentions obligatoires sur une facture au Maroc",
        url: "https://amde.ma/les-mentions-obligatoires-sur-une-facture-au-maroc/",
      },
    ],
    related: ["tva-maroc-devis-facture", "devis-ou-facture-differences"],
  },
  {
    slug: "tva-maroc-devis-facture",
    title: "TVA au Maroc en 2026 : taux de 20 % et 10 %, calcul sur un devis | DevisPlus.ma",
    h1: "TVA au Maroc en 2026 : taux et calcul sur un devis",
    description:
      "Depuis 2026, la TVA marocaine compte deux taux, 20 % et 10 %. Comment calculer la TVA, le TTC, une remise et un acompte sur un devis, avec des exemples chiffrés.",
    lead: "Depuis le 1er janvier 2026, la TVA marocaine compte deux taux : 20 % (taux normal) et 10 % (taux réduit), au terme de la réforme engagée par la loi de finances 2024. Les anciens taux de 7 % et 14 % ne s'appliquent plus. Sur un devis, on calcule la TVA sur le montant hors taxes de chaque ligne, puis on additionne : TTC = HT + TVA.",
    published: "2026-10-18",
    updated: "2026-10-18",
    readingMinutes: 4,
    sections: [
      {
        h2: "Les taux de TVA en vigueur",
        blocks: [
          {
            type: "table",
            head: ["Taux", "Application"],
            rows: [
              ["20 %", "Taux normal : la plupart des biens et des services."],
              ["10 %", "Taux réduit : biens et services énumérés par le CGI."],
              [
                "Exonération",
                "Certaines opérations sont exonérées, avec ou sans droit à déduction : la ligne du devis est alors à 0 %.",
              ],
            ],
          },
          {
            type: "p",
            text: "La note circulaire n° 737 de la DGI, qui présente les mesures de la loi de finances 2026, résume la réforme menée de 2024 à 2026 : deux taux, 20 % et 10 %, et une exonération élargie des produits de première nécessité. Pour savoir quel taux s'applique à votre activité, reportez-vous au CGI ou demandez à votre comptable.",
          },
        ],
      },
      {
        h2: "Fin des taux de 7 % et 14 % : ce que ça change pour vos devis",
        blocks: [
          {
            type: "ul",
            items: [
              "Un nouveau devis n'utilise plus que 20 %, 10 % ou l'exonération.",
              "Les devis et factures déjà émis gardent le taux qui y figure : on ne les modifie pas.",
              "Si votre logiciel ou votre tableur propose encore 7 % ou 14 %, retirez ces taux pour éviter une erreur de saisie.",
            ],
          },
        ],
      },
      {
        h2: "Calculer la TVA sur un devis : exemple",
        blocks: [
          {
            type: "p",
            text: "Prenons un devis d'installation de deux climatiseurs à 6 000 DH HT chacun, au taux normal de 20 % :",
          },
          {
            type: "table",
            caption: "Exemple chiffré",
            head: ["Étape", "Calcul", "Résultat"],
            rows: [
              ["Total HT", "2 × 6 000 DH", "12 000 DH"],
              ["TVA à 20 %", "12 000 × 20 %", "2 400 DH"],
              ["Total TTC", "12 000 + 2 400", "14 400 DH"],
              ["Acompte de 30 %", "14 400 × 30 %", "4 320 DH"],
            ],
          },
          {
            type: "p",
            text: "Si le devis comporte des lignes à des taux différents, calculez la TVA séparément pour chaque taux et indiquez-la ligne par ligne (par exemple « TVA 20 % » et « TVA 10 % ») avant le total TTC.",
          },
        ],
      },
      {
        h2: "Les formules utiles",
        blocks: [
          {
            type: "ul",
            items: [
              "TVA = montant HT × taux (par exemple × 0,20).",
              "TTC = HT × (1 + taux), soit HT × 1,20 au taux normal et HT × 1,10 au taux réduit.",
              "HT = TTC ÷ (1 + taux), par exemple 14 400 ÷ 1,20 = 12 000 DH.",
              "Une remise s'applique sur le montant HT, avant le calcul de la TVA.",
            ],
          },
        ],
      },
      {
        h2: "Comment DevisPlus calcule la TVA",
        blocks: [
          {
            type: "p",
            text: "Dans DevisPlus, chaque ligne a son taux (20 %, 10 % ou 0 %). Les totaux HT, la TVA par taux, le total TTC, l'acompte et le montant en toutes lettres se calculent pendant la saisie. Vous pouvez ajouter un autre taux dans les paramètres si votre activité le justifie.",
          },
          {
            type: "note",
            text: "Ce guide est informatif et ne remplace pas l'avis d'un comptable. Le taux applicable dépend de la nature exacte de chaque bien ou service : vérifiez-le dans le CGI ou auprès de votre comptable.",
          },
        ],
      },
    ],
    sources: [
      {
        label: "La Vie Éco : la DGI publie la note circulaire de la loi de finances 2026",
        url: "https://www.lavieeco.com/argent/budget/document-la-dgi-publie-la-note-circulaire-de-la-loi-de-finances-2026",
      },
      {
        label: "Direction générale des impôts : Code général des impôts et notes circulaires",
        url: "https://www.tax.gov.ma",
      },
    ],
    related: ["mentions-obligatoires-facture-maroc", "devis-ou-facture-differences"],
  },
  {
    slug: "devis-ou-facture-differences",
    title: "Devis ou facture : quelles différences au Maroc ? | DevisPlus.ma",
    h1: "Devis ou facture : quelles différences au Maroc ?",
    description:
      "Le devis propose un prix avant la prestation, la facture constate la vente. Rôle, valeur, numérotation, mentions : les différences, et comment passer d'un devis accepté à la facture.",
    lead: "Le devis est une proposition de prix faite avant la prestation ; la facture constate la vente ou le service réalisé et sert de base à la comptabilité et à la TVA. Un devis accepté et signé par le client fixe en principe le prix et le contenu convenus ; la facture, elle, est obligatoire et obéit à des règles fiscales précises, notamment l'article 145 du Code général des impôts.",
    published: "2026-10-18",
    updated: "2026-10-18",
    readingMinutes: 4,
    sections: [
      {
        h2: "Les différences en un coup d'œil",
        blocks: [
          {
            type: "table",
            head: ["", "Devis", "Facture"],
            rows: [
              ["Moment", "Avant la vente ou les travaux", "Après la vente ou la prestation"],
              [
                "Rôle",
                "Proposer un prix et un contenu",
                "Demander le paiement et constater la vente",
              ],
              [
                "Valeur comptable",
                "Aucune : il n'est pas enregistré en comptabilité",
                "Oui : pièce comptable, base de la TVA",
              ],
              [
                "Numérotation",
                "Libre, mais une série (DV-2026-001…) facilite le suivi",
                "Obligatoire : série continue, sans saut",
              ],
              [
                "Mentions",
                "Pas de liste fixée par le CGI ; mêmes informations recommandées",
                "Mentions fixées par l'article 145 du CGI",
              ],
              [
                "Modification",
                "Possible tant qu'il n'est pas accepté",
                "Interdite une fois émise : on fait un avoir",
              ],
            ],
          },
        ],
      },
      {
        h2: "Quand faire un devis ?",
        blocks: [
          {
            type: "p",
            text: "Le devis est la règle pour les travaux, les installations et les prestations sur mesure, dès que le prix dépend du chantier ou du besoin du client. Il protège les deux parties : le client sait ce qu'il paiera, et vous fixez le périmètre de votre intervention.",
          },
        ],
      },
      {
        h2: "Du devis accepté à la facture",
        blocks: [
          {
            type: "ol",
            items: [
              "Envoyez le devis avec sa date de validité (30 jours est un usage courant) et vos conditions de paiement.",
              "Le client le retourne signé, avec la mention « Bon pour accord » et la date.",
              "Encaissez l'acompte prévu, le cas échéant.",
              "Réalisez la prestation ou livrez les biens.",
              "Émettez la facture : elle reprend le contenu du devis accepté, cite sa référence et porte un numéro de la série des factures.",
              "Suivez les paiements jusqu'au solde.",
            ],
          },
        ],
      },
      {
        h2: "Devis et factures dans DevisPlus",
        blocks: [
          {
            type: "p",
            text: "DevisPlus suit chaque devis (brouillon, envoyé, accepté, refusé) et liste ceux à relancer. Un devis accepté se transforme en facture en un clic : les lignes, le client et les montants sont repris, la facture reçoit le numéro suivant de sa série (FA-2026-…) et devient non modifiable une fois émise. Les paiements reçus sont enregistrés sur la facture.",
          },
          { type: "note", text: DISCLAIMER },
        ],
      },
    ],
    sources: [
      {
        label: "La Vie Éco : l'article 145 du CGI et les factures",
        url: "https://www.lavieeco.com/?p=206098",
      },
      {
        label: "Clicpaie : modèle de facture au Maroc et différence avec le devis",
        url: "https://clicpaie.ma/blogs/modele-facture-maroc/",
      },
      {
        label: "Direction générale des impôts : Code général des impôts",
        url: "https://www.tax.gov.ma",
      },
    ],
    related: ["mentions-obligatoires-facture-maroc", "tva-maroc-devis-facture"],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug) ?? null;
export const GUIDE_PATHS = GUIDES.map((g) => `/guides/${g.slug}`);
