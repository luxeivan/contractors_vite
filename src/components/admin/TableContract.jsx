import { getAllContractors, getAllContracts, getAllPurposes } from '../../lib/getData';
import { Table, Space, Flex, Switch, Button, Modal, Tag, Select, Tooltip } from 'antd';
import Text from 'antd/es/typography/Text';
import React, { useEffect, useState } from 'react'
import ModalViewContract from './ModalViewContract';
import ModalAddContract from './ModalAddContract';
import { ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../store/authStore'
import dayjs from 'dayjs';
const defaultPageSize = 10
const defaultPage = 1

export default function TableContract() {
  const { user } = useAuth(store => store)
  const [pagination, setPagination] = useState()
  const [allContracts, setAllContracts] = useState()
  const [allPurposes, setAllPurposes] = useState()
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false)
  const [docIdForModal, setDocIdForModal] = useState(null)
  const [onlyAtWork, setOnlyAtWork] = useState(0)
  // const [onlySocial, setOnlySocial] = useState(false)
  const [listContractors, setListContractors] = useState(null)
  const [selectedContractor, setSelectedContractor] = useState(null)
  const [selectedPurpose, setSelectedPurpose] = useState(null)


  const fetching = async (defaultPageSize, defaultPage) => {
    try {
      setLoading(true)
      const temp = await getAllContracts(defaultPageSize, defaultPage, { contractorId: selectedContractor, completed: onlyAtWork, purposeId: selectedPurpose })
      // console.log("temp", temp)
      setAllContracts(temp)
      setLoading(false)
    } catch (error) {
      console.log(error);
    }
  }
  const fetchPurposes = async () => {
    try {
      const res = await getAllPurposes(defaultPageSize, defaultPage)
      // console.log(res);

      let temp = res?.data?.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }).map(item => ({
        value: item.id, label: item.name
      }))
      temp.unshift({
        value: false, label: "Все"
      })
      setAllPurposes(temp)
    } catch (error) {
      console.log(error);
    }
  }
  const fetchingContractors = async (defaultPageSize, defaultPage) => {
    try {
      const res = await getAllContractors(defaultPageSize, defaultPage)
      let temp = res?.data?.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      }).map(item => ({
        value: item.id, label: item.name
      }))
      temp.unshift({
        value: false, label: "Все"
      })
      setListContractors(temp)
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetching(defaultPageSize, defaultPage)
    fetchingContractors(100, 1)
    fetchPurposes()
  }, [selectedContractor, onlyAtWork, selectedPurpose])

  // console.log("allContracts", allContracts);
  const columns = [
    // {
    //   title: 'ИНН/КПП',
    //   dataIndex: 'contractor_inn_kpp',
    //   key: 'contractor_inn_kpp',
    //   render: text => <span>{text}</span>,
    // },
    {
      title: 'Номер договора',
      dataIndex: 'number',
      key: 'number',
      render: text => <span>{text}</span>,
    },
    {
      title: 'Дата договора',
      dataIndex: 'dateContract',
      key: 'dateContract',
      render: text => <span>{dayjs(text).format('DD.MM.YYYY')}</span>,
    },
    {
      title: 'Предмет договора',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Номер Тех.Задания',
      dataIndex: 'numberTask',
      key: 'numberTask',
      render: text => <span>{text}</span>,
    },
    {
      title: 'Назначение',
      dataIndex: 'purpose',
      key: 'purpose',
      render: purpose => purpose ? <Tag color={purpose.color}>{purpose.name}</Tag> : false,
    },
    {
      title: 'Количество выполненых этапов',
      dataIndex: 'stepsComplited',
      key: 'stepsComplited',
      render: text => <span>{text}</span>,
    },
    {
      title: 'Подрядчик',
      dataIndex: 'contractor',
      key: 'contractor',
      render: text => <span>{text}</span>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: completed => completed ? <Tag color={"volcano"}>Архивный</Tag> : <Tag color={"green"}>В работе</Tag>,
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => { openModal(record.documentId) }}>Посмотреть</a>
        </Space>
      ),
    },
  ];
  const data = allContracts?.data?.map(item => ({
    key: item.id,
    documentId: item.documentId,
    number: item.number,
    dateContract: item.dateContract,
    description: item.description,
    contractor: item.contractor?.name,
    // social: item.social,
    status: item.completed,
    purpose: item.purpose,
    stepsComplited: item.steps?.length,
    contractor_inn_kpp: `${item.contractor?.inn}/${item.contractor?.kpp}`
  }))

  const handlerReload = async () => {
    if (pagination) {
      fetching(pagination.pageSize, pagination.current)
    } else {
      fetching(defaultPageSize, defaultPage)
    }
  }
  const handlerChange = async (pagination) => {
    // console.log("pagination", pagination);
    setPagination(pagination)
    fetching(pagination.pageSize, pagination.current)
  }
  const handlerAddNewContract = async () => {
    // console.log('Добавить новый объект');
    setIsOpenModalAddContract(true)
  }
  const openModal = async (documentId) => {
    setDocIdForModal(documentId)
    setIsOpenModal(true)
  }
  const closeModal = async () => {
    setDocIdForModal(null)
    setIsOpenModal(false)
  }
  const closeModalAddContract = async () => {
    setIsOpenModalAddContract(false)
  }
  // console.log("listContractors", listContractors);
  // console.log("selectedContractor", selectedContractor);

  return (
    <div>
      <Flex justify='space-between' align='center' style={{ marginBottom: 20 }}>
        <Flex gap={20} align='center'>

          <Flex gap={10} align='center'>
            <Text>Статус:</Text>
            <Select 
            defaultValue={0}
            options={[
              {
                value: 0,
                label: "Все",

              },
              {
                value: 1,
                label: "В работе"
              },
              {
                value: 2,
                label: "Архивный"
              }
            ]}
              style={{ width: 150 }}
              onChange={(value) => { setOnlyAtWork(value) }}
            />
          </Flex>
          <Flex gap={10} align='center'>
            <Text>Назначение:</Text>
            {allPurposes &&
              <Select
                defaultValue="Все"
                style={{ width: 300 }}
                onChange={(value) => {
                  setSelectedPurpose(value)
                }}
                options={allPurposes}
              />
            }
          </Flex>
          <Flex gap={10} align='center'>
            <Text>Подрядчик:</Text>
            {listContractors &&
              <Select
                defaultValue="Все"
                style={{ width: 300 }}
                onChange={(value) => {
                  setSelectedContractor(value)
                }}
                options={listContractors}
                showSearch={true}
                optionFilterProp="label"
              />
            }
          </Flex>
        </Flex>
        <Flex gap={20} align='center'>
          <Tooltip title="Обновить">
            <a onClick={handlerReload}><ReloadOutlined /></a>
          </Tooltip>
          {user?.role?.type !== "readadmin" &&
            <Button onClick={handlerAddNewContract} type='primary'>Добавить новый договор</Button>
          }
        </Flex>
      </Flex>
      <Table
        columns={columns}
        dataSource={data}
        pagination={{
          pageSizeOptions: [10, 25, 50, 100],
          showSizeChanger: {
            options: [
              { value: defaultPageSize, label: defaultPageSize + ' / на странице' },
              { value: 25, label: 25 + ' / на странице' },
              { value: 50, label: 50 + ' / на странице' },
              { value: 100, label: 100 + ' / на странице' },
            ]
          },
          defaultPageSize: defaultPageSize,
          defaultCurrent: defaultPage,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} всего`,
          total: allContracts?.data?.length > 0 ? allContracts.meta.pagination.total : 0,
          align: 'center',

        }}
        onChange={handlerChange}
        loading={loading}
      />
      <ModalViewContract isOpenModal={isOpenModal} closeModal={closeModal} docIdForModal={docIdForModal} update={handlerReload} />
      <Modal
        title="Добавление нового договора"
        open={isOpenModalAddContract}
        onCancel={closeModalAddContract}
        footer={false}
      >
        <ModalAddContract isOpenModalAddContract={isOpenModalAddContract} closeModalAddContract={closeModalAddContract} update={handlerReload} />
      </Modal>

      {/* <Pagination
        total={allContracts.meta.pagination.total}
        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
        defaultPageSize={5}
        pageSize={5}
        defaultCurrent={1}
        showSizeChanger={true}
        pageSizeOptions={[25,50,100]}
        /> */}

    </div>
  )
}
