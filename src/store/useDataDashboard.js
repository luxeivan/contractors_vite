import { create } from "zustand";
import { getMyContractor, getMyContractItem } from "../lib/getData";

const useDataDashboard = create((set) => ({
  myContractor: null,
  contract: null,
  clearContract: async () => set({ contract: null }),
  fetchMyContractor: async () => set({ myContractor: await getMyContractor() }),
  fetchContract: async (idContract) =>
    set({ contract: await getMyContractItem(idContract) }),
}));

export default useDataDashboard;
