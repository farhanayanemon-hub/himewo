import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useListAdAccounts, type AdAccount } from "@workspace/api-client-react";

const STORAGE_KEY = "himewo_ads_account_id";

interface AccountContextValue {
  accounts: AdAccount[];
  isLoading: boolean;
  selectedAccountId: number | null;
  selectedAccount: AdAccount | null;
  setSelectedAccountId: (id: number | null) => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useListAdAccounts();
  const accounts = useMemo<AdAccount[]>(() => data ?? [], [data]);

  const [selectedAccountId, setSelected] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isNaN(n) ? null : n;
  });

  const setSelectedAccountId = (id: number | null) => {
    setSelected(id);
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  };

  // Reconcile selection with the fetched account list.
  useEffect(() => {
    if (isLoading) return;
    if (accounts.length === 0) {
      if (selectedAccountId !== null) setSelectedAccountId(null);
      return;
    }
    const exists = accounts.some((a) => a.id === selectedAccountId);
    if (!exists) setSelectedAccountId(accounts[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, isLoading]);

  const selectedAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? null;

  const value: AccountContextValue = {
    accounts,
    isLoading,
    selectedAccountId: selectedAccount ? selectedAccount.id : null,
    selectedAccount,
    setSelectedAccountId,
  };

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within an AccountProvider");
  return ctx;
}
