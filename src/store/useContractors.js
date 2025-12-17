import { create } from "zustand";
import { server } from "../config";
import { strapi } from "@strapi/client";

const useContractors = create((set, get) => ({
  contractors: null,
  find: async (page = 1, pageSize = 100) => {
    const collectionContractors = get().getCollection();
    const allContractors = await collectionContractors.find({
      populate: {
        contracts: {
          populate: {
            steps: true,
            purpose: true,
            filial: true, 
          },
        },
      },
      sort: {
        name: "asc",
      },
      pagination: {
        page,
        pageSize,
      },
    });
    set({ contractors: allContractors });
  },
  getCollection: () => {
    const client = strapi({
      baseURL: `${server}/api`,
      auth: localStorage.getItem("jwt") || undefined,
    });
    return client.collection("contractors");
  },
}));

export default useContractors;

// import { create } from 'zustand'
// import { server } from '../config';
// import { strapi } from '@strapi/client';

// const useContractors = create((set, get) => ({
//     contractors: null,
//     find: async (page = 1, pageSize = 100) => {
//         const collectionContractors = get().getCollection()
//         const allContractors = await collectionContractors.find({
//             populate: {
//                 contracts: {
//                     populate: ['steps','purpose']
//                 }
//             },
//             sort: {
//                 name: "asc"
//             },
//             pagination: {
//                 page,
//                 pageSize
//             },
//             // filter: {
//             //     contract: {
//             //         overhall: { $eq: true }
//             //     }
//             // }
//         })
//         set({ contractors: allContractors })
//     },
//     getCollection: () => {
//         const client = strapi({
//             baseURL: `${server}/api`,
//             auth: localStorage.getItem('jwt') || undefined
//         })
//         return client.collection('contractors');
//     }
// }))

// export default useContractors;
