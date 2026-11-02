import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BILLING_SEED } from "@/data/mock";
import type {
  Appointment,
  AuditEvent,
  BillingRecord,
  BoxDevice,
  ConnectivityStatus,
  CustomerNotification,
  DemoConfig,
  HybridService,
  OutageState,
  PaymentRecord,
  ScheduledOp,
  SmsMessage,
  TemporaryInternetRequest,
  WorkOrder,
  Workflow,
} from "./types";

/**
 * Central state for every workflow, work order, appointment, temp-internet request,
 * billing record, connectivity status, customer notification and audit event.
 * Mutations go through engine.ts / services, never directly from components.
 */
export interface WorkflowState {
  workflows: Workflow[];
  workOrders: WorkOrder[];
  appointments: Appointment[];
  temp: TemporaryInternetRequest[];
  connectivity: ConnectivityStatus;
  bills: BillingRecord[];
  payments: PaymentRecord[];
  messages: CustomerNotification[];
  box: BoxDevice | null;
  sms: SmsMessage[];
  audit: AuditEvent[];
  ops: ScheduledOp[];
  config: DemoConfig;
  outage: OutageState | null;
  hybrid: HybridService;
  /** Automatic external re-checks. Off while a presenter drives a scenario step by step. */
  autoFollowUp: boolean;
  reset: () => void;
}

export const defaultConfig = (): DemoConfig => ({
  addressCheck: "eligible",
  externalResponse: "ready",
  outageType: "line",
  hybridDevice: true,
  hybridCoverage: true,
  hybridActivation: "success",
  reconciliation: "settled",
  aiFix: "fixed",
  proactive: "remote_fix",
});

export const initialConnectivity = (): ConnectivityStatus => ({
  fixed: "up",
  mobile: "off",
  mode: "fixed",
  hybridEnabled: false,
  lastCheckAt: Date.now(),
  metric: { optic: -19.2, drops: 0, speed: 96 },
  history: [],
});

export const initialHybrid = (): HybridService => ({ status: "unavailable", checks: null, attempts: 0, activatedAt: null, endedAt: null, declinedAt: null, device: null });

const initial = () => ({
  workflows: [] as Workflow[],
  workOrders: [] as WorkOrder[],
  appointments: [] as Appointment[],
  temp: [] as TemporaryInternetRequest[],
  connectivity: initialConnectivity(),
  bills: [{ ...BILLING_SEED.bill, status: "paid" as const, shownDebt: 0 }],
  payments: [{ ...BILLING_SEED.payment, billId: BILLING_SEED.bill.id, status: "success" as const }],
  messages: [] as CustomerNotification[],
  box: null as BoxDevice | null,
  sms: [] as SmsMessage[],
  audit: [] as AuditEvent[],
  ops: [] as ScheduledOp[],
  config: defaultConfig(),
  outage: null as OutageState | null,
  hybrid: initialHybrid(),
  autoFollowUp: true,
});

/** Older saved demos lack the new config keys; fill them so the demo never reads undefined. */
const upgrade = (p: Partial<WorkflowState>) => ({ ...p, config: { ...defaultConfig(), ...(p.config ?? {}) }, hybrid: { ...initialHybrid(), ...(p.hybrid ?? {}) } });

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      ...initial(),
      reset: () => set(initial()),
    }),
    {
      name: "tn-workflow",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 3,
      migrate: (persisted) => ({ ...initial(), ...upgrade(persisted as Partial<WorkflowState>) }) as WorkflowState,
      merge: (persisted, current) => ({ ...current, ...initial(), ...upgrade((persisted ?? {}) as Partial<WorkflowState>), reset: current.reset }),
    },
  ),
);
