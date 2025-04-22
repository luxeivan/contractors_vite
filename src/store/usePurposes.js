import { create } from 'zustand'
import { server } from '../config';
import { strapi } from '@strapi/client';

const usePurposes = create((set, get) => ({
  purposes: null,
  selectPurpose: null,
  find: async () => {
    const collectionPurposes = get().getCollection()
    const allPurposes = await collectionPurposes.find({
      sort: {
        name: "asc"
      },
      pagination: {
        page: 1,
        pageSize: 100,
      }
    })
    set({ purposes: allPurposes })
  },
  findOne: async (id) => {
    set({ bears: newBears })
  },
  update: async (id, data) => {
    const collectionPurposes = get().getCollection()
    const editPurpose = await collectionPurposes.update(id, {
      ...data
    })
    if (editPurpose) {
      get().find()
    }
  },
  create: async (data) => {
    const collectionPurposes = get().getCollection()
    const newPurpose = await collectionPurposes.create({
      ...data
    })
    if (newPurpose) {
      get().find()
    }
  },
  delete: async (id) => {
    // set({ bears: 0 })
  },

  reload: async () => {
    set({ bears: 0 })
  },
  getCollection: () => {
    const client = strapi({
      baseURL: `${server}/api`,
      auth: localStorage.getItem('jwt') || undefined
    })
    return client.collection('purposes');
  }
}))

export default usePurposes;