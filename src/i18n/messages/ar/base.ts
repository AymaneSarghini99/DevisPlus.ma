import type { fr } from "../fr/index";
type M = typeof fr;

export const common: M["common"] = {
  confirm: "تأكيد",
  leave: "المغادرة دون حفظ",
  save: "حفظ",
  cancel: "إلغاء",
  delete: "حذف",
  edit: "تعديل",
  duplicate: "نسخ",
  search: "بحث",
  loading: "جارٍ التحميل…",
  saved: "تم الحفظ",
  unsaved: "غير محفوظ",
  close: "إغلاق",
  today: "اليوم",
  add: "إضافة",
  remove: "إزالة",
  copy: "نسخ",
  language: "اللغة",
  printPdf: "PDF / طباعة",
  downloadPdf: "تحميل PDF",
  pdfPreparing: "جارٍ تجهيز ملف PDF…",
  pdfFailed: "تعذّر إنشاء ملف PDF. استخدم «PDF / طباعة».",
  printHint: "اختر «حفظ بصيغة PDF» لتنزيل الملف",
  previewA4: "معاينة A4 — ما سيُطبع أو يُحفظ بصيغة PDF",
  previewA4Short: "معاينة A4",
  noClient: "بدون عميل",
  pickDate: "اختر تاريخًا",
  required: "حقل إلزامي",
  example: "مثال: {{value}}",
  nothingToReport: "لا شيء يُذكر.",
  noMatch: "لا نتائج لـ «{{query}}».",
  noMatchFilters: "لا توجد نتائج مطابقة لهذه المرشحات.",
  fixFields: "صحّح الحقول المحددة باللون الأحمر.",
  unsavedLeave: "توجد تغييرات غير محفوظة. هل تريد المغادرة على أي حال؟",
  footer: "© 2026 DevisPlus.ma",
};

export const nav: M["nav"] = {
  home: "DevisPlus.ma — الصفحة الرئيسية",
  main: "التنقل الرئيسي",
  dashboard: "عروض الأسعار",
  invoices: "الفواتير",
  followups: "المتابعات",
  clients: "العملاء",
  catalogue: "المنتجات والخدمات",
  reports: "التقارير",
  templates: "القوالب",
  settings: "الإعدادات",
  myQuotes: "عروض أسعاري",
  chooseLanguage: "اختر لغة الواجهة",
};

export const meta: M["meta"] = {
  landing: {
    title: "برنامج عروض الأسعار والفواتير للشركات في المغرب | DevisPlus.ma",
    description:
      "أنشئ عروض أسعار وفواتير احترافية بالدرهم مع ICE وIF والضريبة على القيمة المضافة، وأرسلها PDF أو عبر واتساب. DevisPlus.ma، الدار البيضاء.",
  },
  dashboard: {
    title: "عروض أسعاري — DevisPlus.ma",
    description: "تابع عروض أسعارك ومبالغها وحالاتها.",
  },
  editor: {
    title: "محرر عرض السعر — DevisPlus.ma",
    description: "أدخل العميل والبنود والشروط؛ تتحدث معاينة A4 مباشرة أثناء الكتابة.",
  },
  invoices: {
    title: "الفواتير — DevisPlus.ma",
    description: "الفواتير الناتجة عن عروض الأسعار المقبولة، والدفعات المستلمة والمبالغ المتبقية.",
  },
  invoice: {
    title: "فاتورة — DevisPlus.ma",
    description: "مسودة الفاتورة وإصدارها وتتبع الدفعات.",
  },
  followups: {
    title: "المتابعات — DevisPlus.ma",
    description: "عروض الأسعار التي تنتظر ردًا والعروض التي يقترب تاريخ انتهاء صلاحيتها.",
  },
  clients: {
    title: "العملاء — DevisPlus.ma",
    description: "بطاقات العملاء مع ICE وIF وRC ومعلومات الاتصال وشروط الأداء وسجل عروض الأسعار.",
  },
  catalogue: {
    title: "المنتجات والخدمات — DevisPlus.ma",
    description: "منتجاتك وخدماتك المتكررة، تُضاف إلى عروض الأسعار بنقرة واحدة.",
  },
  reports: {
    title: "التقارير — DevisPlus.ma",
    description: "عروض الأسعار حسب الشهر، ونسبة القبول، والفواتير الصادرة، والمقبوضات، وتصدير CSV.",
  },
  templates: {
    title: "قوالب عروض الأسعار — DevisPlus.ma",
    description: "اختر أو أنشئ تصميم عروض أسعارك.",
  },
  pricing: {
    title: "الأسعار: برنامج عروض أسعار مخصص بـ 2500 درهم | DevisPlus.ma",
    description:
      "العرض الاحترافي: فضاء لعروض الأسعار بألوان شركتك، نُعدّه لك. 2500 درهم دفعة واحدة. اطلب التثبيت.",
  },
  guides: {
    title: "أدلة عروض الأسعار والفواتير في المغرب: البيانات والضريبة | DevisPlus.ma",
    description:
      "أدلة عملية للشركات المغربية (بالفرنسية): البيانات الإلزامية في الفاتورة، والضريبة 20% و10% في 2026، والفرق بين عرض السعر والفاتورة.",
  },
  admin: {
    title: "الإدارة — DevisPlus.ma",
    description: "سجل عملاء DevisPlus ومدفوعاتهم.",
  },
  onboarding: {
    title: "إعداد فضائك — DevisPlus.ma",
    description: "معالج إعداد فضائك: الملف، الشعار، الهوية، العروض والنطاق.",
  },
  settings: {
    title: "الإعدادات — DevisPlus.ma",
    description: "معلومات الشركة والمعرفات الضريبية والبيانات البنكية وتفضيلات الوثائق.",
  },
};

export const status: M["status"] = {
  quote: { brouillon: "مسودة", envoye: "مُرسَل", accepte: "مقبول", refuse: "مرفوض" },
  invoice: { brouillon: "مسودة", emise: "صادرة", paid: "مدفوعة" },
  all: "كل الحالات",
};

export const units: M["units"] = {
  pièce: "قطعة",
  heure: "ساعة",
  jour: "يوم",
  "m²": "م²",
  "m³": "م³",
  ml: "متر طولي",
  kg: "كلغ",
  forfait: "جزافي",
};

export const kinds: M["kinds"] = {
  materiel: "المواد",
  main_oeuvre: "اليد العاملة",
  service: "الخدمات",
  other: "متفرقات",
  unspecified: "غير محدد",
};

export const methods: M["methods"] = {
  virement: "تحويل بنكي",
  cheque: "شيك",
  especes: "نقدًا",
  carte: "بطاقة بنكية",
  effet: "كمبيالة",
  autre: "أخرى",
};

export const validation: M["validation"] = {
  required: "حقل إلزامي",
  ice: "يتكون ICE من 15 رقمًا",
  email: "بريد إلكتروني غير صالح",
  phone: "رقم الهاتف قصير جدًا",
  rib: "يتكون RIB المغربي من 24 رقمًا",
  companyName: "أدخل الاسم التجاري لشركتك",
  clientName: "أدخل اسم العميل",
  lines: "أضف بندًا واحدًا على الأقل مع وصفه",
  date: "التاريخ إلزامي",
  validUntil: "يجب أن يكون بعد تاريخ عرض السعر",
  dueDate: "يجب أن يكون بعد تاريخ الفاتورة",
  exemption: "يوجد بند بنسبة 0%: حدّد سبب الإعفاء من الضريبة",
  rate: "نسبة غير صالحة (من 0 إلى 100).",
  vatList: "احتفظ بنسبة واحدة على الأقل",
  vatDefault: "يجب أن تكون النسبة الافتراضية ضمن القائمة",
  price: "سعر غير صالح",
  url: "عنوان موقع غير صالح",
  passwordShort: "8 أحرف على الأقل",
  passwordMatch: "كلمتا المرور غير متطابقتين",
  range: "القيمة خارج الحدود المسموح بها",
  subdomain: "من 3 إلى 40 حرفًا: أحرف لاتينية صغيرة وأرقام وشرطات",
  reserved: "هذا العنوان محجوز، اختر عنوانًا آخر",
  domain: "اسم نطاق غير صالح (مثال: devis.mycompany.ma)",
  templateName: "أعطِ اسمًا لقالبك",
};

export const errors: M["errors"] = {
  storage: "تعذّر الحفظ: مساحة تخزين المتصفح ممتلئة أو محظورة (الشعار كبير جدًا؟).",
  unexpected: "حدث خطأ غير متوقع.",
  quoteNotAccepted: "لا يمكن تحويل عرض سعر إلى فاتورة إلا إذا كان مقبولًا.",
  alreadyIssued: "هذه الفاتورة صادرة بالفعل.",
  invoiceClient: "اسم العميل إلزامي.",
  invoiceLines: "لا تحتوي الفاتورة على أي بند.",
  issuedLocked: "لا يمكن حذف فاتورة صادرة.",
  paymentDraft: "تُسجَّل الدفعات على الفواتير الصادرة فقط.",
  paymentDate: "أدخل تاريخ الدفع.",
  paymentAmount: "يجب أن يكون المبلغ أكبر من صفر.",
  paymentTooHigh: "المبلغ يتجاوز المبلغ المتبقي.",
  logoFormat: "الصيغ المقبولة: PNG أو JPG أو WebP أو SVG.",
  logoSize: "الصورة كبيرة جدًا (5 ميغابايت كحد أقصى).",
  logoRead: "تعذّرت قراءة الصورة.",
  onboardingIncomplete: "بعض الخطوات غير مكتملة.",
  exportFailed: "التصدير غير متاح في هذا المتصفح.",
  copyFailed: "النسخ غير متاح في هذا المتصفح.",
  notFoundTitle: "الصفحة غير موجودة",
  notFoundText: "الصفحة المطلوبة غير موجودة أو تم نقلها.",
  goHome: "العودة إلى الصفحة الرئيسية",
  crashTitle: "تعذّر تحميل هذه الصفحة",
  crashText: "حدث خطأ ما. أعد المحاولة أو عُد إلى الصفحة الرئيسية.",
  retry: "إعادة المحاولة",
};
