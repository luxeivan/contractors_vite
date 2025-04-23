import axios from 'axios'
import dayjs from 'dayjs'
import { server } from "../config";
import { strapi } from '@strapi/client';

function getJwt() {
    return localStorage.getItem('jwt')
}



// Запрос одного договора для пользователя--------------------------------------------------------------------------
export async function getMyContractItem(idContract) {
    try {
        const res = await axios.get(server + `/api/mycontracts/${idContract}`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            // console.log(res.data.data)
            return res.data
        }

    } catch (error) {
        console.log("error getContractItem:", error);
    }
}
export async function getContractItem(idContract) {
    try {
        const res = await axios.get(server + `/api/contracts/${idContract}?populate[0]=contractor&populate[1]=document&populate[2]=steps.photos&populate[3]=purpose`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            // console.log(res.data.data)
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
export async function getAllContracts(pageSize = 5, page = 1, filters = {},) {
    const client = strapi({
        baseURL: `${server}/api`,
        auth: localStorage.getItem('jwt') || undefined
    })
    // console.log(filters);

    try {
        const contracts = client.collection('contracts');
        const allContracts = await contracts.find({
            filters: {
                contractor: filters.contractorId ? {
                    id: {
                        $eq: filters.contractorId
                    }
                } : undefined,
                // social: filters.social ? filters.social : undefined,
                completed: filters.completed === 0 ? undefined : (filters.completed === 2 ? true : false),
                purpose: filters.purposeId ? {
                    id: {
                        $eq: filters.purposeId
                    }
                } : undefined,
            },
            populate: {
                steps: true,
                contractor: true,
                purpose: true
            },
            sort: {
                dateContract: "desc"
            },
            pagination: {
                page: page,
                pageSize: pageSize,
            }
        });
        if (allContracts.data) {
            return allContracts
        }
    } catch (error) {
        console.log("error getAllContracts:", error);
    }
}



// Запрос всех назначений--------------------------------------------------------------------------
export async function getAllPurposes(pageSize = 100, page = 1, filters = {},) {
    const client = strapi({
        baseURL: `${server}/api`,
        auth: localStorage.getItem('jwt') || undefined
    })
    try {
        const purposes = client.collection('purposes');

        const allPurposes = await purposes.find({

            sort: {
                name: "asc"
            },
            pagination: {
                page: page,
                pageSize: pageSize,
            }
        });
        if (allPurposes.data) {
            return allPurposes
        }
    } catch (error) {
        console.log("error getAllPurposes:", error);
    }
}

// Запрос всех подрядчиков для админской учетки--------------------------------------------------------------------------
export async function getAllContractors(pageSize = 5, page = 1, filters = {}) {

    try {
        const res = await axios.get(server + `/api/contractors?pagination[pageSize]=${pageSize}&pagination[page]=${page}&sort=createdAt:desc`, {
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
        // console.log(roleList);

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
            // console.log(file);

            const resContract = await axios.post(server + `/api/contracts`, {
                data: {
                    number: data.number,
                    dateContract: dayjs(data.dateContract).add(1, 'day'),
                    description: data.description,
                    numberTask: data.numberTask,
                    comment: data.comment,
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

// Обрновить пароль у пользователя подрядчика
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
            // console.log("resContract.data", resContract.data);
            return resContract.data.data
        } else {
            return false
        }
    } catch (error) {
        console.log("error changePassword :", error);
        return false
    }
}

// Завершить договор
export async function completedContract(documentId) {
    try {

        const resContract = await axios.put(server + `/api/contracts/${documentId}`, {
            data: {
                completed: true
            }
        }, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        // ---------------------------------------------------------
        if (resContract.data) {
            // console.log("resContract.data", resContract.data);
            return resContract.data.data
        } else {
            return false
        }
    } catch (error) {
        console.log("error changePassword :", error);
        return false
    }
}

// Проверка на существование подрядчика по ИНН и КПП
export async function checkContractor(inn, kpp) {
    try {
        const res = await axios.get(server + `/api/contractors?filters[inn][$eq]=${inn}&filters[kpp][$eq]=${kpp}`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            if (res.data.data.length > 0) {
                return true
            } else {
                return false
            }
        }
        // console.log("checkContractor:", res.data);
    } catch (error) {
        console.log("error checkContractor:", error);

    }
}
// Проверка на существование договора по номеру и дате
export async function checkContract(idContractor, number, date) {
    try {
        const res = await axios.get(server + `/api/contracts?filters[number][$eq]=${number}&filters[dateContract][$eq]=${date}&filters[contractor][id][$eq]=${idContractor}`, {
            headers: {
                Authorization: `Bearer ${await getJwt()}`
            }
        })
        if (res.data) {
            if (res.data.data.length > 0) {
                return true
            } else {
                return false
            }
        }
        // console.log("checkContractor:", res.data);
    } catch (error) {
        console.log("error checkContract:", error);

    }
}