import type { fr } from "../fr/index";
type M = typeof fr;

export const landing: M["landing"] = {
  eyebrow: "عروض الأسعار · الدرهم · الضريبة · ICE",
  headline: "عرض السعر الذي يقرؤه عميلك ويفهمه ويوقّعه.",
  lead: "يُعدّ DevisPlus عروض أسعار بالدرهم، مع ICE وIF وضريبة القيمة المضافة، في دقائق ودون جداول بيانات.",
  cta: "إنشاء عرض سعر",
  sampleCity: "الدار البيضاء",
  sampleLine1: "نجارة خشبية — باب المدخل",
  sampleLine2: "التركيب والتشطيبات",
  sampleNote: "معاينة توضيحية",
  steps: {
    s1: {
      title: "شركتك وعميلك",
      text: "الاسم التجاري وICE والعنوان. تُستعاد معلوماتك تلقائيًا في عرض السعر التالي.",
    },
    s2: {
      title: "بنود الخدمات",
      text: "الكميات وأسعار الوحدة دون احتساب الضريبة، وضريبة القيمة المضافة بنسبة 20% أو 14% أو 10% أو 7%. تُحسب المجاميع أثناء الإدخال.",
    },
    s3: {
      title: "ملف PDF بحجم A4 جاهز للإرسال",
      text: "تصميم بسيط، ومبالغ مرتبة، وشروط الأداء في أسفل الوثيقة.",
    },
  },
};

export const dashboard: M["dashboard"] = {
  title: "عروض أسعاري",
  create: "إنشاء عرض سعر",
  kpiCount: "عروض الأسعار",
  kpiPending: "في انتظار الرد",
  kpiAccepted: "المقبولة",
  emptyTitle: "لا توجد عروض أسعار بعد",
  emptyText: "أنشئ أول عرض سعر: ستُحفظ معلوماتك للعروض التالية.",
  searchLabel: "البحث عن عرض سعر",
  searchPlaceholder: "الرقم أو العميل…",
  filterStatus: "التصفية حسب الحالة",
  colNumber: "الرقم",
  colClient: "العميل",
  colDate: "التاريخ",
  colValidity: "صالح إلى غاية",
  colStatus: "الحالة",
  colTotal: "المجموع شامل الضريبة",
  duplicateOf: "نسخ {{number}}",
  deleteOf: "حذف {{number}}",
  confirmDelete: "هل تريد حذف عرض السعر {{number}}؟",
  copied: "تم إنشاء نسخة: {{number}}",
  noMatch: "لا توجد عروض أسعار مطابقة لهذه المرشحات.",
};

export const party: M["party"] = {
  name: "الاسم التجاري *",
  ice: "ICE",
  contact: "الشخص المسؤول",
  address: "العنوان",
  city: "المدينة",
  phone: "الهاتف",
  email: "البريد الإلكتروني",
  if: "التعريف الضريبي (IF)",
  rc: "السجل التجاري (RC)",
  tp: "الرسم المهني (TP)",
};

export const design: M["design"] = {
  accent: "لون التمييز",
  colourOf: "اللون {{value}}",
};
