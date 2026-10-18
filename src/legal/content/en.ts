import type { LegalContent } from "./types";

// Draft texts — not legally validated. Every section with `review` must be checked by a
// Moroccan legal professional before publication. The French version is the reference text.
export const en: LegalContent = {
  terms: {
    title: "Terms of Service",
    summary: "Rules for using DevisPlus.ma, quotation and invoicing software for businesses.",
    sections: [
      {
        id: "acceptance",
        title: "Purpose and acceptance",
        body: [
          "These terms govern the use of the DevisPlus.ma software (the “platform”). By using the platform, you confirm that you have read and accepted them.",
          "They do not replace a separate customisation, implementation or maintenance agreement signed with the operator: if the two conflict, that separate agreement prevails for the services it describes.",
        ],
        review:
          "Method of acceptance (use alone or checkbox) and relationship with separate agreements.",
      },
      {
        id: "operator",
        title: "Operator and contact",
        body: [
          "The platform is operated by {{legalName}} ({{legalForm}}), registered office {{address}}, trade register no. {{rc}}, ICE {{ice}}, IF {{if_}}.",
          "Contact: {{email}} — {{phone}}.",
        ],
      },
      {
        id: "service",
        title: "Description of the service",
        body: [
          "The platform lets you create quotes, invoices, client records and a product and service catalogue, follow up on quotes and export your data as CSV files.",
          "In its current version, all of this data is stored only in the browser of the device you use (local storage). It is not sent to the operator's servers, is not synchronised between devices and is not backed up by the operator.",
          "The platform does not currently offer user accounts, online payment, email sending or custom domains. If these features are added, these terms will be updated before they go live.",
        ],
      },
      {
        id: "eligibility",
        title: "Users and authority to bind the business",
        body: [
          "The platform is intended for professionals. Anyone using it on behalf of a business confirms that they are authorised to do so and to bind that business.",
        ],
        review: "User status (professionals only?) and its effect on consumer law.",
      },
      {
        id: "accounts",
        title: "Accounts and security",
        body: [
          "There are currently no accounts. Access to the data depends on access to the device and browser: it is your responsibility to protect that device (session, password, screen lock) and not to let others use it.",
        ],
      },
      {
        id: "responsibilities",
        title: "Your responsibilities",
        body: [
          {
            list: [
              "provide accurate information about your business (company name, ICE, IF, RC, TP, contact details);",
              "check every quote and invoice before sending it: amounts, VAT rates, mandatory details, exemption reasons;",
              "comply with the rules that apply to your clients, your business documents and your activity;",
              "hold the rights to the logos, texts and files you upload;",
              "keep your own copies (CSV, PDF exports) of your documents.",
            ],
          },
          "Calculations and templates are provided as tools: they are neither tax advice nor a guarantee that your documents are compliant.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        body: [
          "You agree to follow the Acceptable Use Policy and, in particular, not to use the platform to issue misleading or fraudulent documents.",
        ],
      },
      {
        id: "data-ownership",
        title: "Your data and your brand",
        body: [
          "Your company information, logo, clients, quotes and invoices remain your property. The operator has no access to them in the current version, since they stay on your device.",
        ],
      },
      {
        id: "ip",
        title: "DevisPlus intellectual property",
        body: [
          "The software, its code, its document templates and the DevisPlus.ma brand belong to the operator or its licensors. Buying a customised version does not transfer ownership of the underlying software, unless a separate agreement says otherwise.",
        ],
        review: "Scope of the licence granted and the case of bespoke agreements.",
      },
      {
        id: "third-parties",
        title: "Third-party services",
        body: [
          "The platform loads fonts from Google Fonts and can open WhatsApp to prepare a message. These services are provided by third parties under their own terms; the operator does not control their availability or operation.",
        ],
      },
      {
        id: "availability",
        title: "Availability, maintenance and changes",
        body: [
          "The operator aims to keep the site available but does not guarantee uninterrupted availability. Maintenance may require interruptions. Features may change; any change that substantially reduces a paid service will be announced in advance.",
          "Because the data is stored in your browser, clearing it (browser cleanup, private browsing, a new device) means losing it. Export it regularly.",
        ],
      },
      {
        id: "termination",
        title: "Suspension and end of use",
        body: [
          "You may stop using the platform at any time; your data stays on your device until you delete it. In case of a serious breach of these terms, the operator may restrict access to the service, after giving notice unless there is an emergency or a legal obligation.",
        ],
        review: "Suspension conditions and procedure, particularly for paying customers.",
      },
      {
        id: "liability",
        title: "Liability",
        body: [
          "The operator is liable for direct damage caused by a proven breach of its obligations, within the limits allowed by applicable law. It is not liable for the content of the documents you create, nor for the loss of data stored on your device.",
          "Nothing in these terms limits rights that the law grants on a mandatory basis.",
        ],
        review:
          "Validity and wording of liability limitations under Moroccan law (DOC, Law 31-08).",
      },
      {
        id: "law",
        title: "Governing law and disputes",
        body: [
          "These terms are governed by Moroccan law. In case of a dispute, the parties will first seek an amicable solution by writing to {{email}}. Failing that, the dispute will be brought before {{court}}.",
        ],
        review: "Competent court and possible mediation, to be set with legal counsel.",
      },
      {
        id: "changes",
        title: "Changes to these terms",
        body: [
          "Each version has a number and a date. A substantial change will be announced on the site before it takes effect; earlier versions are available on request.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    summary:
      "What personal data DevisPlus.ma processes, where it is kept, and how to exercise your rights.",
    sections: [
      {
        id: "controller",
        title: "Data controller",
        body: [
          "The controller for the processing described here is {{legalName}}, {{address}}. Contact for any personal data question: {{email}}.",
          "CNDP declaration: {{cndp}}.",
        ],
        review:
          "Check whether the processing must be declared to the CNDP (Law 09-08) and give the reference obtained.",
      },
      {
        id: "two-kinds",
        title: "Two kinds of data",
        body: [
          {
            list: [
              "data about you as a user of the platform (your business, your language preference, technical connection data);",
              "data you enter about your own clients (names, ICE, addresses, phone numbers, emails, quotes, invoices, payments). Your business decides how that data is used: see the “Data processing and responsibilities” page.",
            ],
          },
        ],
      },
      {
        id: "where",
        title: "Where your data is stored",
        body: [
          "In the current version, your company information, logo, clients, catalogue, quotes, invoices and payments are stored only in your browser's local storage, on your device. They are not sent to the operator's servers, so the operator can neither view, restore nor back them up.",
          "The platform does not encrypt this data: its protection depends on the security of your device and browser.",
        ],
      },
      {
        id: "collected",
        title: "Data processed by the operator",
        body: [
          {
            list: [
              "your language choice, stored in a cookie on your device and sent to the site with each page so it can be shown in the right language;",
              "technical data received by the hosting provider on each visit (IP address, date, page requested, browser), in its technical logs;",
              "the information you send us if you contact us (email, phone).",
            ],
          },
          "The platform uses no audience measurement, no advertising and no advertising trackers.",
        ],
      },
      {
        id: "purposes",
        title: "Purposes and legal grounds",
        body: [
          {
            list: [
              "providing the site and showing it in your language (performance of the service);",
              "ensuring security and proper technical operation (legitimate interest / hosting obligations);",
              "answering your requests (your request).",
            ],
          },
        ],
        review: "Lawful grounds under Law 09-08 (consent and the exceptions in Article 4).",
      },
      {
        id: "recipients",
        title: "Recipients and providers",
        body: [
          "Website hosting: {{host}}, servers located in {{hostLocation}}.",
          "Fonts: on each visit, your browser downloads fonts from Google's servers (Google Fonts), which therefore receive your IP address. This can be avoided by hosting the fonts on the site.",
          "WhatsApp: when you click “WhatsApp” or “Prepare the reminder”, the message text and the client's number are sent to WhatsApp (Meta) to open the conversation. Nothing is sent until you click.",
        ],
        review:
          "Identity of the hosting provider and transfers outside Morocco (Articles 43 and 44 of Law 09-08).",
      },
      {
        id: "transfers",
        title: "Transfers outside Morocco",
        body: [
          "The providers mentioned (hosting provider, Google, WhatsApp) may process data outside Morocco. Law 09-08 regulates such transfers and may require CNDP authorisation depending on the destination country.",
        ],
        review: "Analysis of the transfers and any steps required with the CNDP.",
      },
      {
        id: "retention",
        title: "Retention periods",
        body: [
          "Data entered in the platform stays in your browser until you delete it or clear the site's data. The language cookie expires after 12 months. How long technical logs are kept depends on the hosting provider: {{host}}.",
        ],
        review: "Retention period for logs and support exchanges to be set.",
      },
      {
        id: "security",
        title: "Security",
        body: [
          "The site is designed not to send your business data to the operator. As no system is perfectly secure, protect access to your device and export your data regularly.",
        ],
      },
      {
        id: "rights",
        title: "Your rights",
        body: [
          "Under Law 09-08 you have, in particular, rights of information, access, rectification and objection on legitimate grounds. For data that stays on your device, you can view, edit, export (Reports page) and delete it yourself at any time.",
          "For any other request, write to {{email}} describing your request. You can also contact the National Commission for the Control of Personal Data Protection (CNDP, www.cndp.ma).",
        ],
        review: "Exact list of rights and response times to be checked against Law 09-08.",
      },
      {
        id: "updates",
        title: "Updates",
        body: [
          "This policy will be updated if the processing changes, in particular if accounts, online storage, payments or emails are added. The date and version are shown at the top of the page.",
        ],
      },
    ],
  },

  cookies: {
    title: "Cookie Policy",
    summary: "The cookies and local storage actually used by DevisPlus.ma.",
    sections: [
      {
        id: "what",
        title: "What is a cookie?",
        body: [
          "A cookie is a small file that a site places in your browser. “Local storage” is a similar mechanism that lets a site save information on your device.",
        ],
      },
      {
        id: "used",
        title: "What DevisPlus.ma uses",
        body: [
          {
            list: [
              "Cookie “devisplus.lang”: remembers the interface language (French, English or Arabic). Duration: 12 months. Needed to show the site in the language you chose.",
              "Local storage “devisplus.quotes”, “devisplus.invoices”, “devisplus.clients”, “devisplus.catalog”, “devisplus.settings”: holds your quotes, invoices, clients, catalogue and settings. This is how the application works: without it, nothing would be saved.",
            ],
          },
          "No audience measurement, advertising or social media cookies are used.",
        ],
      },
      {
        id: "third-party",
        title: "Requests to third parties",
        body: [
          "Fonts are loaded from Google Fonts: this is not a cookie, but Google receives your IP address when they load.",
        ],
      },
      {
        id: "consent",
        title: "Why there is no consent banner",
        body: [
          "Because the site only uses the language cookie and the storage needed for the service, it does not show a banner to accept or refuse optional trackers: there are none. If optional trackers are ever added, they will only be enabled with your consent.",
        ],
        review: "Confirm that no consent is required for these uses under Moroccan law.",
      },
      {
        id: "manage",
        title: "Managing or deleting",
        body: [
          "You can delete the cookie and local storage in your browser settings (site data). Warning: deleting local storage permanently erases the quotes, invoices and clients saved on this device. Export them first from the Reports page.",
        ],
      },
      {
        id: "contact",
        title: "Contact",
        body: ["For any question: {{email}}."],
      },
    ],
  },

  refunds: {
    title: "Refund and Cancellation Policy",
    summary:
      "What is purchased, how delivery is confirmed, and how to request a cancellation or refund.",
    sections: [
      {
        id: "scope",
        title: "What this page covers",
        body: [
          "The operator may offer the purchase of a customised version of DevisPlus for a business. These terms set out the principles; the quote or agreement signed for each order states the price, content and timeline. The platform does not currently offer online payment.",
        ],
        review:
          "This whole page depends on the actual commercial offer, to be finalised before publication.",
      },
      {
        id: "items",
        title: "What can be purchased",
        body: [
          {
            list: [
              "a right to use the software (licence), one-time or periodic depending on the offer;",
              "implementation services: brand customisation, templates, configuration;",
              "help configuring a domain name, the domain remaining registered in the client's name with their registrar;",
              "where applicable, hosting and maintenance, which are ongoing services billed separately;",
              "third-party costs (domain name, external services) passed on at cost.",
            ],
          },
          "A “one-time” or “lifetime” purchase is not a commitment to unlimited hosting, support or availability, unless the agreement expressly says so.",
        ],
      },
      {
        id: "delivery",
        title: "Delivery and acceptance",
        body: [
          "Implementation services are delivered when the customised version is available to the client and matches the signed quote. The client has {{acceptanceDelay}} to report a problem.",
        ],
        review: "Acceptance period and acceptance procedure to be defined.",
      },
      {
        id: "issues",
        title: "Setup problems, defects and delays",
        body: [
          "In case of a defect or delay, write to {{email}} describing the problem. The operator fixes whatever falls within its commitments. If the service cannot be delivered as quoted, the amounts for the undelivered part are refunded.",
        ],
      },
      {
        id: "withdrawal",
        title: "Right of withdrawal",
        body: [
          "Where a purchase is made at a distance by a consumer, Law 31-08 on consumer protection provides a right of withdrawal under the conditions it sets. These legal rights are not limited by this page.",
        ],
        review:
          "Whether Law 31-08 applies (business-to-business purchases?) and the exact wording of Article 36, to be checked in the Official Bulletin.",
      },
      {
        id: "request",
        title: "Requesting a cancellation or refund",
        body: [
          "Send your request to {{email}} with the order or quote number and the reason. The operator acknowledges receipt and replies in writing. Accepted refunds are made using the original payment method or by bank transfer, within {{refundDelay}}.",
        ],
        review: "Refund processing time to be set.",
      },
      {
        id: "third-party-costs",
        title: "Third-party costs and ongoing services",
        body: [
          "Amounts already paid to third parties on the client's behalf (for example a domain registration) generally cannot be recovered from those third parties; how they are handled is stated in the quote, subject to the client's legal rights. Cancelling a hosting or maintenance service takes effect at the end of the current period, unless the agreement says otherwise.",
        ],
        review: "Treatment of non-recoverable costs under applicable law.",
      },
    ],
  },

  "acceptable-use": {
    title: "Acceptable Use Policy",
    summary: "What is not allowed on DevisPlus.ma, and how to report abuse.",
    sections: [
      {
        id: "prohibited",
        title: "Prohibited uses",
        body: [
          {
            list: [
              "any illegal activity;",
              "creating false or misleading quotes or invoices, or ones intended for fraud (false identity, fake ICE, fictitious amounts, impersonating a business);",
              "uploading logos, trademarks or content you do not have the right to use;",
              "attempting unauthorised access to the site, its servers or another user's data, or bypassing a protection;",
              "introducing malware, disrupting the service or attacking it (denial of service, injection, abusive automated crawling);",
              "using the messaging features to send unsolicited or unlawful messages;",
              "using a custom domain to mislead the public or infringe someone else's rights.",
            ],
          },
        ],
      },
      {
        id: "report",
        title: "Reporting abuse or a vulnerability",
        body: [
          "Write to {{email}} describing the problem. For a security vulnerability, do not exploit it beyond what is needed to demonstrate it and do not disclose any data; the operator will reply to you.",
        ],
      },
      {
        id: "measures",
        title: "Measures and appeals",
        body: [
          "In case of proven abuse, the operator may, proportionately, warn the user, restrict or suspend access to the service and, where the law requires, inform the authorities. Except in an emergency, the user is told the reason and can respond by writing to {{email}}.",
        ],
        review: "Suspension and appeal procedure to be validated.",
      },
    ],
  },

  "data-processing": {
    title: "Data Processing and Responsibilities",
    summary:
      "The role of DevisPlus.ma and that of your business for the data you record about your clients.",
    sections: [
      {
        id: "roles",
        title: "Who is responsible for what",
        body: [
          "When you record information about your clients (names, contacts, ICE, addresses, quotes, invoices, payments), your business decides why and how that data is used: it is the controller within the meaning of Law 09-08.",
          "In the current version, this data stays in your browser and is not sent to the operator, which therefore does not act as a hosting processor for it. If online storage is added, a data processing agreement will be offered before it goes live.",
        ],
        review:
          "Qualification of the roles and need for a processing agreement if online storage is added.",
      },
      {
        id: "purposes",
        title: "Permitted purposes",
        body: [
          "The platform is designed for creating quotes and invoices, tracking payments and following up with your clients. Record only the data needed for these purposes, and no sensitive data.",
        ],
      },
      {
        id: "your-duties",
        title: "Your obligations towards your clients",
        body: [
          {
            list: [
              "inform your clients that their data is processed;",
              "where applicable, complete the CNDP formalities for your own processing;",
              "respond to your clients' requests for access, rectification or objection — you can edit or delete their records at any time;",
              "protect the device on which the data is stored and limit access to authorised people.",
            ],
          },
        ],
        review: "Exact obligations of the customer business under Law 09-08.",
      },
      {
        id: "security",
        title: "Security and confidentiality",
        body: [
          "Data only leaves your device if you export, print or share it (for example via WhatsApp). Exported files (CSV, PDF) must be stored securely.",
        ],
      },
      {
        id: "subprocessors",
        title: "Providers",
        body: [
          "None of the operator's providers receives your clients' data in the current version. When you use WhatsApp, you choose to send the message and the client's number to that service.",
        ],
      },
      {
        id: "export-deletion",
        title: "Export and deletion",
        body: [
          "You can export your clients, quotes, invoices and payments from the Reports page, and delete each item in the application. Clearing the site's data in your browser erases everything.",
        ],
      },
      {
        id: "incidents",
        title: "Security incidents",
        body: [
          "If the operator becomes aware of a software flaw likely to expose data, it will inform users on the site and through the contact channels available to it, as soon as possible.",
        ],
        review: "Incident notification times and methods to be specified.",
      },
      {
        id: "contact",
        title: "Cooperation and contact",
        body: ["For any question about these responsibilities: {{email}}."],
      },
    ],
  },
};
