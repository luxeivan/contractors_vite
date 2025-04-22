import axios from 'axios'
import { create } from 'zustand'
import { server } from "../config";


const useAuth = create((set, get) => ({
  user: null,
  role: null,
  changeUserAndRole: (user, role) => {
    set({ user, role })
  },
  clearUserAndRole: () => {
    set({ user: null, role: null })
  },
  getUser: async () => {
    if (localStorage.getItem('jwt')) {
      try {
        const res = await axios.get(server + `/api/users/me?populate[0]=role`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('jwt')}`
          }
        })
        if (res.data) {
          // console.log(res.data);
          
          await set({ user: res.data, role: res.data.role })
          return res.data
        }
      } catch (error) {
        console.log("error getUser:", error);
        return false
      }
    } else {
      return false
    }
  },
  login: async (username, password) => {
    try {
      const response = await axios
        .post(server + '/api/auth/local', {
          identifier: username,
          password: password,
        })
      if (response.data.jwt) {
        localStorage.setItem('jwt', response.data.jwt)
        return response.data
      } else {
        return false
      }
    } catch (error) {
      console.log('Ошибка авторизации', error);
      // throw new Error(error)
      return false
    }
  }
}))

export default useAuth;