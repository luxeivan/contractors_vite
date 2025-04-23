import { getAllContractors } from '../../lib/getData';
import { Table, Space, Pagination, Flex, Switch, Button, Modal, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react'
import { ReloadOutlined } from '@ant-design/icons';
import ModalViewContractor from './ModalViewContractor';
import ModalAddContractor from './ModalAddContractor';
import useAuth from '../../store/authStore'
import dayjs from 'dayjs';
const defaultPageSize = 10
const defaultPage = 1

export default function TableContractor() {
  const { user } = useAuth(store => store)
  const [pagination, setPagination] = useState()
  const [allContractors, setAllContractors] = useState()
  const [loading, setLoading] = useState(true)
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isOpenModalAddContract, setIsOpenModalAddContract] = useState(false)
  const [docIdForModal, setDocIdForModal] = useState(null)

  const fetching = async (defaultPageSize, defaultPage) => {
    try {
      setLoading(true)
      const temp = await getAllContractors(defaultPageSize, defaultPage)
      // console.log("temp", temp)
      setAllContractors(temp)
      setLoading(false)
    } catch (error) {
      console.log(error);

    }

  }
  useEffect(() => {
    fetching(defaultPageSize, defaultPage)
  }, [])

  // console.log("allContractors", allContractors);
  const columns = [
    // {
    //   title: 'Подрядчик',
    //   dataIndex: 'contractor',
    //   key: 'contractor',
    //   render: text => <span>{text}</span>,
    // },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: text => <span>{text}</span>,
    },
    {
      title: 'ИНН-КПП',
      dataIndex: 'contractor_inn_kpp',
      key: 'contractor_inn_kpp',
      render: text => <span>{text}</span>,
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => <span style={{ color: "#666" }}>{dayjs(date).format('DD.MM.YYYY')}</span>,
    },
    // {
    //   title: 'Социальный объект',
    //   dataIndex: 'social',
    //   key: 'social',
    //   render: bool => <Switch disabled defaultValue={bool} />,
    // },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      render: text => <span>{text}</span>,
    },
  ];
  if (user?.role?.type !== "readadmin") {
    columns.push({
      title: 'Действия',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => { openModal(record.documentId) }}>Посмотреть</a>
        </Space>
      ),
    })
  }
  const data = allContractors?.data?.map(item => ({
    key: item.id,
    documentId: item.documentId,
    name: item.name,
    description: item.description,
    createdAt: item.createdAt,
    comment: item.comment,
    // contractor: item.contractor.name,
    // social: item.social,
    contractor_inn_kpp: `${item.inn}-${item.kpp}`
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
    // console.log('Добавить новый договор');
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
      <Flex justify='end' align='center' style={{ marginBottom: 20 }}>
        <Flex gap={20} align='center'>
          <Tooltip title="Обновить">
            <a onClick={handlerReload}><ReloadOutlined /></a>
          </Tooltip>
          {user.role.type !== "readadmin" &&
            <Button onClick={handlerAddNewContract} type='primary'>Добавить нового подрядчика</Button>
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
          total: allContractors?.data?.length > 0 ? allContractors.meta.pagination.total : 0,
          align: 'center',

        }}
        onChange={handlerChange}
        loading={loading}
      />
      <ModalViewContractor isOpenModal={isOpenModal} closeModal={closeModal} docIdForModal={docIdForModal} />
      <Modal
        title="Добавление нового подрядчика"
        open={isOpenModalAddContract}
        onCancel={closeModalAddContract}
        footer={false}
      >
        <ModalAddContractor isOpenModalAddContract={isOpenModalAddContract} closeModalAddContract={closeModalAddContract} update={handlerReload} />


      </Modal>

    </div>
  )
}
