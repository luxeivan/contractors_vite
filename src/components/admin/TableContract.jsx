import { getAllContracts } from '../../lib/getData';
import { Table, Space,  Flex, Switch, Button, Modal } from 'antd';
import React, { useEffect, useState } from 'react'
import ModalViewContract from './ModalViewContract';
import ModalAddContract from './ModalAddContract';
import { ReloadOutlined } from '@ant-design/icons';
import useAuth from '../../store/authStore'
const defaultPageSize = 10
const defaultPage = 1

export default function TableContract() {
  const { user } = useAuth(store => store)
  const [pagination, setPagination] = useState()
  const [allContracts, setAllContracts] = useState()
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false)
  const [docIdForModal, setDocIdForModal] = useState(null)

  const fetching = async (defaultPageSize, defaultPage) => {
    try {
      setLoading(true)
      const temp = await getAllContracts(defaultPageSize, defaultPage)
      // console.log("temp", temp)
      setAllContracts(temp)
      setLoading(false)
    } catch (error) {
      console.log(error);

    }

  }
  useEffect(() => {
    fetching(defaultPageSize, defaultPage)
  }, [])

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
      render: text => <span>{text}</span>,
    },
    {
      title: 'Предмет договора',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Социальный объект',
      dataIndex: 'social',
      key: 'social',
      render: bool => <Switch disabled defaultValue={bool} />,
    },
    {
      title: 'Кол-во выполненых этапов',
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
    dateContract:item.dateContract,
    description: item.description,
    contractor: item.contractor?.name,
    social: item.social,
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

  return (
    <div>
      <Flex justify='space-between' align='center' style={{ marginBottom: 20 }}>
        <a onClick={handlerReload}><ReloadOutlined /></a>
        {user?.role?.type!=="readadmin" &&
        <Button onClick={handlerAddNewContract} type='primary'>Добавить новый договор</Button>
        }
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
      <ModalViewContract isOpenModal={isOpenModal} closeModal={closeModal} docIdForModal={docIdForModal} />
      <Modal
        title="Добавление нового договора"
        open={isOpenModalAddContract}
        onCancel={closeModalAddContract}
        footer={false}
      >
        <ModalAddContract isOpenModalAddContract={isOpenModalAddContract} closeModalAddContract={closeModalAddContract} update={handlerReload}/>
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
