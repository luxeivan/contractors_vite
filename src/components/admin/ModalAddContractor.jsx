import { addNewContractor, checkContractor } from "../../lib/getData";
import { Button, Flex, Form, Input } from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { passwordStrength } from "check-password-strength";
import Text from "antd/es/typography/Text";
import debounce from "lodash/debounce";


function generatePassword(length = 12) {
  const specials = "!@#$%^&*()_+-=[]{}|;:,./<>?";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const all = specials + lowers + uppers + digits;

  let pwd = "";
  pwd += specials.charAt(Math.floor(Math.random() * specials.length));
  pwd += uppers.charAt(Math.floor(Math.random() * uppers.length));
  pwd += lowers.charAt(Math.floor(Math.random() * lowers.length));
  pwd += digits.charAt(Math.floor(Math.random() * digits.length));

  for (let i = 4; i < length; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }

  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function ModalAddContractor({
  isOpenModalAddContract,
  closeModalAddContract,
  update,
}) {
  const navigate = useNavigate();
  const [formAddContractor] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [inn, setInn] = useState("");
  const [kpp, setKpp] = useState("");
  const [isCheckContractor, setIsCheckContractor] = useState(false);

  const fetchCheckContractor = debounce((innValue, kppValue) => {
    checkContractor(innValue, kppValue)
      .then(setIsCheckContractor)
      .catch(console.error);
  }, 1000);

  useEffect(() => {
    if (inn && kpp) {
      fetchCheckContractor(inn, kpp);
    }
  }, [inn, kpp]);

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);
    formAddContractor.setFieldsValue({
      password: newPassword,
      password2: newPassword,
    });
    // Обновляем валидацию после автозаполнения
    formAddContractor.validateFields(["password", "password2"]);
  };

  const onFinish = async (values) => {
    setUploading(true);
    await addNewContractor(values);
    setUploading(false);
    closeModalAddContract();
    formAddContractor.resetFields();
    update();
  };

  return (
    <Form
      name="formAddContractor"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 600 }}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      form={formAddContractor}
      autoComplete="off"
    >
      <Form.Item
        label="Наименование"
        name="name"
        rules={[
          { required: true, message: "Пожалуйста введите наименование." },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="ИНН"
        name="inn"
        rules={[{ required: true, message: "Пожалуйста введите ИНН." }]}
      >
        <Input
          maxLength={10}
          minLength={10}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, "");
            e.target.value = value;
            setInn(value);
            formAddContractor.setFieldValue("inn", value);
          }}
        />
      </Form.Item>

      <Form.Item
        label="КПП"
        name="kpp"
        rules={[{ required: true, message: "Пожалуйста введите КПП." }]}
      >
        <Input
          maxLength={9}
          minLength={9}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9]/g, "");
            e.target.value = value;
            setKpp(value);
            formAddContractor.setFieldValue("kpp", value);
          }}
        />
      </Form.Item>

      <Flex justify="end">
        <Text style={{ color: "#999", fontSize: 10 }}>
          Пароль должен быть не менее 10 символов, иметь заглавную букву и
          спецсимвол
        </Text>
      </Flex>

      {/* Пароль с кнопкой генерации */}
      <Form.Item label="Пароль" required>
        <Input.Group compact>
          <Form.Item
            name="password"
            noStyle
            rules={[
              { required: true, message: "Пожалуйста введите пароль." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (
                    passwordStrength(value).value === "Medium" ||
                    passwordStrength(value).value === "Strong"
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Пароль слишком слабый"));
                },
              }),
            ]}
          >
            <Input.Password style={{ width: "calc(100% - 130px)" }} />
          </Form.Item>
          <Button onClick={handleGeneratePassword}>Сгенерировать</Button>
        </Input.Group>
      </Form.Item>

      <Form.Item
        label="Пароль еще раз"
        name="password2"
        dependencies={["password"]}
        rules={[
          { required: true, message: "Пожалуйста повторите пароль." },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Пароли не совпадают"));
            },
          }),
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item label={null}>
        <Button type="primary" htmlType="submit" disabled={isCheckContractor}>
          {uploading ? "Добавляется..." : "Добавить подрядчика"}
        </Button>
      </Form.Item>

      {isCheckContractor && (
        <Text style={{ color: "red" }}>
          Подрядчик с таким ИНН-КПП уже существует
        </Text>
      )}
    </Form>
  );
}

// import { addNewContractor, checkContractor } from '../../lib/getData'
// import { Button, Flex, Form, Input, } from 'antd'
// import React, { useEffect, useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import { passwordStrength } from 'check-password-strength'
// import Text from 'antd/es/typography/Text'
// import debounce from "lodash/debounce";

// export default function ModalAddContractor({ isOpenModalAddContract, closeModalAddContract, update }) {
//   const navigate = useNavigate()
//   const [formAddContractor] = Form.useForm()
//   const [uploading, setUploading] = useState(false);
//   const [inn, setInn] = useState(false);
//   const [kpp, setKpp] = useState(false);
//   const [isCheckContractor, setIsCheckContractor] = useState(false);

//   const fetchCheckContractor = debounce((inn, kpp) => {
//     checkContractor(inn, kpp)
//       .then((res) => {
//         console.log(res)
//         setIsCheckContractor(res)
//       })
//       .catch((error) => {
//         console.log("error", error)
//       })
//   }, 1000)
//   useEffect(() => {
//     // if (inn.length === 10 && kpp.length === 9){
//       fetchCheckContractor(inn, kpp)
//     // }
//   }, [inn, kpp])

//   const onFinish = async values => {
//     setUploading(true)
//     const newContractor = await addNewContractor(values)
//     // console.log('newContractor:', newContractor);
//     setUploading(false)
//     closeModalAddContract()
//     formAddContractor.resetFields()
//     update()
//     // router.refresh()
//   };
//   return (

//     <Form
//       name="formAddContractor"
//       labelCol={{ span: 8 }}
//       wrapperCol={{ span: 16 }}
//       style={{ maxWidth: 600 }}
//       initialValues={{ remember: true }}
//       onFinish={onFinish}
//       form={formAddContractor}
//       // onFinishFailed={onFinishFailed}
//       autoComplete="off"
//     >
//       <Form.Item
//         label="Наименование"
//         name="name"
//         rules={[{ required: true, message: 'Пожалуйста введите наименование.' }]}
//       >
//         <Input />
//       </Form.Item>
//       <Form.Item
//         label="ИНН"
//         name="inn"
//         rules={[{ required: true, message: 'Пожалуйста введите ИНН.' }]}
//       >
//         <Input
//           maxLength={10}
//           minLength={10}
//           onChange={(e) => {
//             let value = e.target.value.replace(/[^0-9]/g, "");
//             e.target.value = value;
//             setInn(value)
//             formAddContractor.setFieldValue("inn", value);
//           }}
//         />
//       </Form.Item>
//       <Form.Item
//         label="КПП"
//         name="kpp"
//         rules={[
//           { required: true, message: 'Пожалуйста введите КПП.' },
//         ]}
//       >
//         <Input
//           maxLength={9}
//           minLength={9}
//           onChange={(e) => {
//             let value = e.target.value.replace(/[^0-9]/g, "");
//             e.target.value = value;
//             setKpp(value)
//             formAddContractor.setFieldValue("kpp", value);
//           }}
//         />
//       </Form.Item>
//       <Flex justify='end'>
//         <Text style={{ color: "#999", fontSize: 10 }}>Пароль должен быть не менее 10 символов иметь заглавную букву и спецсимвол</Text>
//       </Flex>

//       <Form.Item
//         label="Пароль"
//         name="password"
//         rules={[
//           { required: true, message: 'Пожалуйста введите пароль.' },
//           ({ getFieldValue }) => ({
//             validator(_, value) {

//               if (passwordStrength(value).value === 'Medium' || passwordStrength(value).value === 'Strong') {
//                 return Promise.resolve();
//               }
//               return Promise.reject(new Error('Пароль слишком слабый'));
//             },
//           }),
//         ]}
//       >
//         <Input.Password />
//       </Form.Item>

//       <Form.Item
//         label="Пароль еще раз"
//         name="password2"
//         dependencies={['password']}
//         rules={[
//           {
//             required: true,
//             message: 'Пожалуйста повторите пароль.'
//           },
//           ({ getFieldValue }) => ({
//             validator(_, value) {
//               if (!value || getFieldValue('password') === value) {
//                 return Promise.resolve();
//               }
//               return Promise.reject(new Error('Пароли не совпадают'));
//             },
//           }),
//         ]}
//       >
//         <Input.Password />
//       </Form.Item>

//       <Form.Item label={null}>

//         <Button type="primary" htmlType="submit" disabled={isCheckContractor}>
//           {uploading ? 'Добавляется...' : 'Добавить подрядчика'}
//         </Button>
//       </Form.Item>
//       {isCheckContractor &&
//         <Text style={{ color: "red" }}>Подрядчик с таким ИНН-КПП уже существует</Text>
//       }
//     </Form>
//   )
// }
