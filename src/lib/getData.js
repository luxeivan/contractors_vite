import axios from 'axios'
import dayjs from 'dayjs'
import { server } from "../config";
async function getJwt() {
    return localStorage.getItem('jwt')
}

// Запрос одного договора для пользователя--------------------------------------------------------------------------
export async function getContractItem(idContract) {
    try {
        const res = await axios.get(server + `/api/contracts/${idContract}?populate[0]=contractor&populate[1]=document&populate[2]=steps.photos`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            console.log(res.data.data)
            return res.data.data
        }

    } catch (error) {
        console.log("error getContractItem:", error);
    }
}

// Запрос одного подрядчика для пользователя--------------------------------------------------------------------------
export async function getContractorItem(idContractor) {

    try {
        const res = await axios.get(server + `/api/contractors/${idContractor}?populate=contracts`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            return res.data
        }
    } catch (error) {
        console.log("error getContractorItem:", error);
    }
}

// Запрос только своего подрядчика для пользователя--------------------------------------------------------------------------
export async function getMyContractor() {
    try {
        const res = await axios.get(server + '/api/mycontractors?populate=contracts', {
            headers: {

                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            return res.data.results[0]
        }
        // console.log("contractors:", contractors);
    } catch (error) {
        console.log("error getMyContractor:", error);

    }
}

// Запрос всех договоров для админской учетки--------------------------------------------------------------------------
export async function getAllContracts(pageSize = 5, page = 1) {

    try {
        const res = await axios.get(server + `/api/contracts?pagination[pageSize]=${pageSize}&pagination[page]=${page}&populate[0]=contractor&populate[1]=steps`, {
            headers: {

                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            return res.data
        }
        // console.log("contractors:", contractors);
    } catch (error) {
        console.log("error getAllContracts:", error);
    }
}

// Запрос всех подрядчиков для админской учетки--------------------------------------------------------------------------
export async function getAllContractors(pageSize = 5, page = 1) {

    try {
        const res = await axios.get(server + `/api/contractors?pagination[pageSize]=${pageSize}&pagination[page]=${page}`, {
            headers: {

                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            return res.data
        }
        // console.log("contractors:", contractors);
    } catch (error) {
        console.log("error getAllContractors:", error);
    }
}

// Запрос одного подрядчика для админской учетки--------------------------------------------------------------------------
export async function getContractorItemForAdmin(idContractor) {

    try {
        const res = await axios.get(server + `/api/contractors/${idContractor}?populate[0]=contracts&populate[1]=user`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            return res.data.data
        }
    } catch (error) {
        console.log("error getContractorItemForAdmin:", error);
    }
}


// Добавление нового подрядчика--------------------------------------------------------------------------
export async function addNewContractor(data) {
    try {
        // ---------------------------------------------------
        const roleList = await axios.get(server + `/api/users-permissions/roles`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        console.log(roleList);

        // ---------------------------------------------------
        const resUser = await axios.post(server + `/api/users`, {

            username: `${data.inn}-${data.kpp}`,
            email: `${data.inn}@${data.kpp}.ru`,
            password: data.password,
            role: roleList.data.roles.find(item => item.type === 'user').id,
            confirmed: true

        }, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        // -------------------------------------------------------
        if (resUser.data) {
            const resContractor = await axios.post(server + `/api/contractors`, {
                data: {
                    name: data.name,
                    inn: data.inn,
                    kpp: data.kpp,
                    user: resUser.data.id,
                }
            }, {
                headers: {
                    Authorization: `Bearer ${await getJwt()}`
                }
            })
            // ---------------------------------------------------------
            if (resContractor.data) {
                return resContractor.data.data
            }
        }
    } catch (error) {
        console.log("error addNewContractor :", error);
    }
}
// Добавление нового договора--------------------------------------------------------------------------
export async function addNewContract(formData, data) {
    try {
        const file = await axios.post(server + '/api/upload',
            formData,
            {
                headers: {
                    Authorization: `Bearer ${await getJwt()}`
                }
            })

        // -------------------------------------------------------

        if (file) {
            console.log(file);

            const resContract = await axios.post(server + `/api/contracts`, {
                data: {
                    number: data.number,
                    dateContract: dayjs(data.dateContract).add(1, 'day'),
                    description: data.description,
                    social: data.social,
                    document: file.data[0].id,
                    contractor: data.contractor
                }
            }, {
                headers: {
                    Authorization: `Bearer ${await getJwt()}`
                }
            })
            // ---------------------------------------------------------
            if (resContract.data) {
                return resContract.data.data
            }
        }
    } catch (error) {
        console.log("error addNewContract :", error);
    }
}

export async function updatePassword(userId, newPassword) {
    try {
        // console.log("userId", userId);
        // console.log("newPassword", newPassword);
        
        const resContract = await axios.put(server + `/api/users/${userId}`, {
            
                password: newPassword
            
        }, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        // ---------------------------------------------------------
        if (resContract.data) {
            console.log("resContract.data", resContract.data);
            
            return resContract.data.data
        }

    } catch (error) {
        console.log("error changePassword :", error);
    }
}