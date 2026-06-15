export type RoleId = "manager" | "admin" | "user";

export type Permission =
  | "sign_document"
  | "create_document"
  | "pay_payroll"
  | "manage_employees"
  | "open_account"
  | "manage_products"
  | "edit_account"
  | "manage_security"
  | "manage_services"
  | "verify_counterparty"
  | "order_cash";

export interface Role {
  id: RoleId;
  fullName: string;
  firstName: string;
  gender: "male" | "female";
  position: string;
  initials: string;
  description: string;
  portrait: string;
  permissions: Permission[];
}

export const ROLES: Record<RoleId, Role> = {
  manager: {
    id: "manager",
    fullName: "Александр Иванов",
    firstName: "Александр",
    gender: "male",
    position: "Руководитель",
    initials: "АИ",
    portrait: "/images/roles/role_manager.png",
    description:
      "Подписывает финансовые документы, проводит платежи и выплаты, открывает счета и продукты.",
    permissions: [
      "sign_document",
      "create_document",
      "pay_payroll",
      "open_account",
      "manage_products",
      "edit_account",
      "verify_counterparty",
      "order_cash",
      "manage_employees",
    ],
  },
  admin: {
    id: "admin",
    fullName: "Александра Петрова",
    firstName: "Александра",
    gender: "female",
    position: "Администратор",
    initials: "АП",
    portrait: "/images/roles/role_admin.png",
    description:
      "Настройки безопасности, IP, ЭЦП, API-ключи и сервисы. Управление сотрудниками реестра. Не подписывает финансовые документы.",
    permissions: ["manage_security", "manage_services", "manage_employees", "edit_account", "verify_counterparty"],
  },
  user: {
    id: "user",
    fullName: "Александра Сидорова",
    firstName: "Александра",
    gender: "female",
    position: "ИП",
    initials: "АС",
    portrait: "/images/roles/role_user.png",
    description:
      "Индивидуальный предприниматель. Готовит черновики документов, проверяет контрагентов, смотрит выписки. Не подписывает и не проводит платежи.",
    permissions: ["create_document", "verify_counterparty"],
  },
};

export const ROLE_ORDER: RoleId[] = ["manager", "admin", "user"];

export const PERMISSION_LABEL: Record<Permission, string> = {
  sign_document: "подписание документов",
  create_document: "создание документов",
  pay_payroll: "выплата зарплаты",
  manage_employees: "управление сотрудниками",
  open_account: "открытие счетов",
  manage_products: "управление продуктами",
  edit_account: "редактирование счетов",
  manage_security: "настройки безопасности",
  manage_services: "управление сервисами",
  verify_counterparty: "проверка контрагентов",
  order_cash: "кассовые операции",
};
