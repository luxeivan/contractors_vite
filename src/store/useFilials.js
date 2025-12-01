import { create } from 'zustand'
import { server } from '../config';
import { strapi } from '@strapi/client';

const useFilials = create((set, get) => ({
  filials: null,
  selectFilials: null,
  find: async () => {
    const collectionFilials = get().getCollection()
    const allFilials = await collectionFilials.find({
      sort: {
        name: "asc"
      },
      pagination: {
        page: 1,
        pageSize: 100,
      }
    })
    set({ filials: allFilials })
  },  
  update: async (id, data) => {
    const collectionFilials = get().getCollection()
    const editFilials = await collectionFilials.update(id, {
      ...data
    })
    if (editFilials) {
      get().find()
    }
  },
  create: async (data) => {
    const collectionFilials = get().getCollection()
    const newFilials = await collectionFilials.create({
      ...data
    })
    if (newFilials) {
      get().find()
    }
  },
  delete: async (id) => {
    // set({ bears: 0 })
  },
 
  getCollection: () => {
    const client = strapi({
      baseURL: `${server}/api`,
      auth: localStorage.getItem('jwt') || undefined
    })
    return client.collection('filials');
  }
}))

export default useFilials;