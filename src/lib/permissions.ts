// Permission catalog (shared by server guards and the dashboard UI).

export const PERMISSION_GROUPS = [
  { key: "dashboard", ar: "لوحة التحكم", en: "Dashboard", perms: [["dashboard.view", "عرض المؤشرات والتقارير", "View KPIs & reports"]] },
  {
    key: "orders", ar: "الطلبات", en: "Orders",
    perms: [
      ["orders.view", "عرض الطلبات", "View orders"],
      ["orders.manage", "تغيير الحالة وتعيين المندوب", "Change status & assign riders"],
      ["orders.cancel", "إلغاء الطلبات واسترداد المبالغ", "Cancel & refund orders"],
      ["orders.export", "تصدير الطلبات", "Export orders"],
    ],
  },
  { key: "partners", ar: "المغاسل", en: "Laundries", perms: [["partners.view", "عرض المغاسل", "View laundries"], ["partners.manage", "إضافة وتعديل وتفعيل المغاسل والأسعار", "Add, edit, approve laundries & prices"]] },
  { key: "drivers", ar: "المندوبين", en: "Riders", perms: [["drivers.view", "عرض المندوبين", "View riders"], ["drivers.manage", "إضافة وإيقاف المندوبين", "Add & suspend riders"]] },
  {
    key: "customers", ar: "الزبائن", en: "Customers",
    perms: [
      ["customers.view", "عرض الزبائن", "View customers"],
      ["customers.manage", "إيقاف وتفعيل الحسابات", "Suspend & restore accounts"],
      ["customers.credit", "إضافة رصيد للمحفظة", "Credit wallets"],
    ],
  },
  { key: "catalog", ar: "الخدمات", en: "Services", perms: [["catalog.manage", "إدارة الخدمات", "Manage services"]] },
  { key: "subscriptions", ar: "الاشتراكات", en: "Memberships", perms: [["subscriptions.view", "عرض الاشتراكات والإيرادات", "View memberships & revenue"], ["subscriptions.manage", "إدارة الباقات والمشتركين", "Manage plans & members"]] },
  { key: "marketing", ar: "التسويق", en: "Marketing", perms: [["promos.manage", "إدارة أكواد الخصم", "Manage promo codes"], ["campaigns.send", "إرسال الحملات والإشعارات", "Send campaigns & notifications"]] },
  {
    key: "system", ar: "النظام", en: "System",
    perms: [
      ["settings.manage", "تعديل إعدادات المنصة", "Change platform settings"],
      ["staff.manage", "إدارة الموظفين والصلاحيات", "Manage staff & roles"],
      ["audit.view", "عرض سجل العمليات", "View audit log"],
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["perms"][number][0];
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p[0])) as Permission[];

/** Built-in roles. super_admin always has every permission (including future ones). */
export const SYSTEM_ROLES: { key: string; ar: string; en: string; desc_ar: string; desc_en: string; perms: Permission[] | "*" }[] = [
  { key: "super_admin", ar: "مدير عام", en: "Super admin", desc_ar: "صلاحيات كاملة على كل شيء", desc_en: "Full access to everything", perms: "*" },
  {
    key: "operations", ar: "العمليات", en: "Operations", desc_ar: "إدارة الطلبات والمغاسل والمندوبين يومياً", desc_en: "Runs orders, laundries and riders day to day",
    perms: ["dashboard.view", "orders.view", "orders.manage", "orders.cancel", "orders.export", "partners.view", "partners.manage", "drivers.view", "drivers.manage", "customers.view", "catalog.manage"],
  },
  {
    key: "support", ar: "خدمة العملاء", en: "Customer support", desc_ar: "متابعة الطلبات ومساعدة الزبائن", desc_en: "Helps customers and follows up orders",
    perms: ["orders.view", "orders.manage", "orders.cancel", "customers.view", "customers.credit", "partners.view", "drivers.view", "subscriptions.view"],
  },
  {
    key: "finance", ar: "المالية", en: "Finance", desc_ar: "الإيرادات والتقارير والاشتراكات", desc_en: "Revenue, reports and memberships",
    perms: ["dashboard.view", "orders.view", "orders.export", "partners.view", "customers.view", "subscriptions.view", "audit.view"],
  },
  {
    key: "marketing", ar: "التسويق", en: "Marketing", desc_ar: "العروض والحملات والاشتراكات", desc_en: "Promos, campaigns and memberships",
    perms: ["dashboard.view", "customers.view", "promos.manage", "campaigns.send", "subscriptions.view", "subscriptions.manage"],
  },
];

/** Which permission unlocks each dashboard page (used for navigation and page guards). */
export const PAGE_PERMISSION: Record<string, Permission> = {
  "/admin": "dashboard.view",
  "/admin/orders": "orders.view",
  "/admin/partners": "partners.view",
  "/admin/drivers": "drivers.view",
  "/admin/customers": "customers.view",
  "/admin/catalog": "catalog.manage",
  "/admin/subscriptions": "subscriptions.view",
  "/admin/promos": "promos.manage",
  "/admin/campaigns": "campaigns.send",
  "/admin/staff": "staff.manage",
  "/admin/audit": "audit.view",
  "/admin/settings": "settings.manage",
};
