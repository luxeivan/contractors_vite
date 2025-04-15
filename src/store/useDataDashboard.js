import { create } from 'zustand'
import { getMyContractor,getContractItem } from '../lib/getData';

const useDataDashboard = create((set) => ({
  myContractor: null,
  contract:null,
  fetchMyContractor: async () => set({ myContractor: await getMyContractor() }),
  fetchContract: async (idContract) => set({ contract: await getContractItem(idContract) }),
}))

export default useDataDashboard;