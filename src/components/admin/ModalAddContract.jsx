import {
  addNewContract,
  checkContract,
  getAllContractors,
  getAllPurposes,
} from "../../lib/getData";
import { UploadOutlined } from "@ant-design/icons";
import {
  Button,
  ConfigProvider,
  DatePicker,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Typography,
} from "antd";
import React, { useEffect, useState, useMemo } from "react";
import locale from "antd/es/locale/ru_RU";
import { debounce } from "lodash";
import dayjs from "dayjs";
const { Text } = Typography;

export default function ModalAddContract({
  // isOpenModalAddContract,
  closeModalAddContract,
  update,
}) {
  const [contractors, setContractors] = useState([]);
  const [purpose, setPurpose] = useState([]);
  const [defaultPurpose, setDefaultPurpose] = useState();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [idContractor, setIdContractor] = useState(false);
  const [number, setNumber] = useState(false);
  const [dateContract, setDateContract] = useState(false);
  const [isCheckContract, setIsCheckContract] = useState(false);

  const [form] = Form.useForm();
  const fetchContractors = async () => {
    const allContractors = await getAllContractors(100, 1);
    setContractors(
      allContractors.data.map((item) => ({
        value: item.id,
        label: item.name,
      }))
    );
  };
  const fetchPurposes = async () => {
    const allPurposes = await getAllPurposes(100, 1);
    setPurpose(
      allPurposes.data.map((item) => ({
        value: item.id,
        label: item.name,
      }))
    );
    // console.log(allPurposes);
    const def = allPurposes.data.find(item => item.name === "Прочее")?.name
    console.log(def);
    
    setDefaultPurpose(def)
  };

  const fetchCheckContract = useMemo(
    () =>
      debounce((idContractor, number, dateContract) => {
        if (!idContractor || !number || !dateContract) return; // ранний выход
        checkContract(idContractor, number, dateContract)
          .then((res) => {
            // console.log("Тестируем", res);
            setIsCheckContract(res);
          })
          .catch((error) => console.log("error", error));
      }, 1000),
    []
  );
  useEffect(() => {
    fetchContractors()
    fetchPurposes()
  }, [])



  useEffect(() => {
    fetchCheckContract(idContractor, number, dateContract);
    return () => fetchCheckContract.cancel();
  }, [idContractor, number, dateContract, fetchCheckContract]);

  useEffect(() => {
    fetchCheckContract(idContractor, number, dateContract);
  }, [idContractor, number, dateContract]);

  async function handleUpload(values) {
    // console.log("values", values)
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append("files", file);
    });
    setUploading(true);
    try {
      const newContractor = await addNewContract(formData, values);
      if (newContractor) {
        // console.log("newStep", newStep);
        setFileList([]);
        closeModalAddContract(false);
        form.resetFields();
        update();
      } else {
        throw new Error("Ошибка добавления договора");
      }

      // message.success('upload successfully.');
    } catch (error) {
      console.log("Ошибка добавления договора: ", error);
    }

    setUploading(false);
  }
  const props = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      // console.log("file", file);
      setFileList((prev) => [...prev, file]);
      return false;
    },
    fileList,
  };

  // console.log(defaultPurpose)

  return (
    <ConfigProvider locale={locale}>
      <Form
        form={form}
        onFinish={handleUpload}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item name="contractor" label="Подрядчик" required>
          <Select
            showSearch
            placeholder="Выберите подрядчика"
            optionFilterProp="label"
            onChange={(event) => {
              console.log(event);
              setIdContractor(event);
            }}
            // onSearch={onSearch}
            options={contractors}
          />
        </Form.Item>
        <Form.Item name="number" label="Номер договора" required>
          <Input
            onChange={(e) => {
              setNumber(e.target.value);
            }}
          />
        </Form.Item>
        <Form.Item name="dateContract" label="Дата договора" required>
          <DatePicker
            format={"DD.MM.YYYY"}
            onChange={(e) => {
              // console.log(e);
              setDateContract(dayjs(e).format("YYYY-MM-DD"));
            }}
          />
        </Form.Item>
        <Form.Item name="description" label="Предмет договора">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="numberTask" label="Номер Тех.Задания">
          <Input />
        </Form.Item>
        {/* <Form.Item name="comment" label="Комментарий">
          <Input.TextArea />
        </Form.Item> */}
        <Form.Item name="purpose" label="Назначение" required={true} initialValue={39}>
          <Select options={purpose} />
        </Form.Item>

        <Upload {...props} accept=".jpg,.jpeg,.png,.pdf">
          <Button icon={<UploadOutlined />}>Выбрать документ</Button>
        </Upload>
        <Form.Item label={null}>
          <Button
            type="primary"
            htmlType="submit"
            disabled={fileList.length === 0 || isCheckContract}
            loading={uploading}
            style={{ marginTop: 16 }}
          >
            {uploading ? "Добавляется..." : "Добавить договор"}
          </Button>
        </Form.Item>
        {isCheckContract && (
          <Text style={{ color: "red" }}>
            Договор с таким номером и датой уже существует
          </Text>
        )}
      </Form>
    </ConfigProvider>
  );
}
