import {
  createAccount,
  createEmployee,
  createPaymentRequest,
  fetchStatement,
  patchAccountNote,
} from "@/lib/api/banking";
import { bankingToast } from "@/lib/banking/toast";

export type BankingActionContext = {
  reload?: () => Promise<void>;
  openModal?: (id: string) => void;
  routerPush?: (path: string) => void;
};

export async function runBankingAction(
  actionId: string,
  payload: Record<string, unknown> = {},
  ctx: BankingActionContext = {},
): Promise<boolean> {
  try {
    switch (actionId) {
      case "order-cash": {
        const req = await createPaymentRequest("cash_order", {
          amount: payload.amount ?? 0,
          currency: payload.currency ?? "BYN",
          branch: payload.branch ?? "01-Минск",
          phone: payload.phone ?? "",
        });
        bankingToast(`Заявка на наличные зарегистрирована (${req.id.slice(0, 8)}…)`, "ok");
        await ctx.reload?.();
        return true;
      }
      case "fx-trade": {
        const req = await createPaymentRequest("fx_trade", {
          side: payload.side ?? "BUY",
          currency: payload.currency ?? "USD",
          amount: payload.amount ?? 0,
        });
        bankingToast(`Заявка на конверсию ${payload.side} ${payload.amount} ${payload.currency} в БД`, "ok");
        await ctx.reload?.();
        return true;
      }
      case "connect-softpos": {
        await createPaymentRequest("service", { service: "softpos", status: "requested" });
        bankingToast("Заявка на SoftPOS сохранена в PostgreSQL", "ok");
        return true;
      }
      case "tax-certificate": {
        await createPaymentRequest("certificate", { kind: "tax_clearance", period: "2026-Q1" });
        bankingToast("Запрос справки обязательств отправлен", "ok");
        return true;
      }
      case "fszn-certificate": {
        await createPaymentRequest("certificate", { kind: "fszn_clearance" });
        bankingToast("Запрос справки ФСЗН зарегистрирован", "ok");
        return true;
      }
      case "add-employee": {
        await createEmployee({
          full_name: String(payload.fullName ?? ""),
          card_mask: String(payload.cardMask ?? "**** 0000"),
          amount: Number(payload.amount ?? 0),
        });
        bankingToast("Сотрудник добавлен в реестр (PostgreSQL)", "ok");
        await ctx.reload?.();
        return true;
      }
      case "open-account": {
        await createAccount({
          currency: String(payload.currency ?? "BYN"),
          label: String(payload.label ?? "Новый счёт"),
        });
        bankingToast("Расчётный счёт открыт и записан в БД", "ok");
        await ctx.reload?.();
        return true;
      }
      case "patch-account-note": {
        await patchAccountNote(String(payload.accountId ?? ""), String(payload.note ?? ""));
        bankingToast("Заметка к счёту сохранена", "ok");
        await ctx.reload?.();
        return true;
      }
      case "generate-statement": {
        const lines = await fetchStatement(
          payload.accountId as string | undefined,
          String(payload.period ?? "month"),
        );
        bankingToast(`Выписка: ${lines.length} операций из PostgreSQL`, "ok");
        return true;
      }
      default:
        bankingToast(`Действие «${actionId}» пока не подключено`, "info");
        return false;
    }
  } catch (e) {
    bankingToast(e instanceof Error ? e.message : "Ошибка API", "err");
    return false;
  }
}
