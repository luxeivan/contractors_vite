import React, { useEffect, useState, useMemo } from "react";
import useContractors from "../../store/useContractors";
import {
  Checkbox,
  Collapse,
  Flex,
  List,
  Spin,
  Tag,
  Typography,
  Select,
} from "antd";
import dayjs from "dayjs";
import ModalViewContract from "./ModalViewContract";
import { getAllFilials } from "../../lib/getData";

export default function TableReport() {
  const { contractors, find } = useContractors((store) => store);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [sortLastStep, setSortLastStep] = useState(false);
  const [docIdForModal, setDocIdForModal] = useState(null);
  const [filials, setFilials] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFilials = async () => {
    try {
      const res = await getAllFilials(100, 1);
      const temp = res.data
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          value: item.id,
          label: item.name,
        }));
      temp.unshift({ value: null, label: "Все" });
      setFilials(temp);
    } catch (e) {
      console.error("fetchFilials error:", e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([find(), fetchFilials()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const openModal = (docId) => {
    setDocIdForModal(docId);
    setIsOpenModal(true);
  };

  const closeModal = () => {
    setDocIdForModal(null);
    setIsOpenModal(false);
  };

  const matchFilial = (contract, selectedFilialId) => {
    if (selectedFilialId === null) {
      return true;
    }

    if (!contract || !contract.filial) {
      return false;
    }

    return (
      contract.filial.id === selectedFilialId ||
      contract.filial?.documentId === selectedFilialId
    );
  };

  const processedData = useMemo(() => {
    if (!contractors?.data || contractors.data.length === 0) return [];

    const result = [];

    contractors.data.forEach((contractor) => {
      const filteredContracts = (contractor.contracts || []).filter(
        (contract) => {
          if (contract.purpose?.id === 49) return false;

          return matchFilial(contract, selectedFilial);
        }
      );

      if (filteredContracts.length > 0) {
        const stepsCount = filteredContracts.reduce(
          (acc, contract) => acc + (contract.steps?.length || 0),
          0
        );

        const contractsWithoutSteps = filteredContracts.filter(
          (contract) => !contract.steps || contract.steps.length === 0
        ).length;

        let lastStepDate = null;
        const allSteps = [];

        filteredContracts.forEach((contract) => {
          if (contract.steps && Array.isArray(contract.steps)) {
            contract.steps.forEach((step) => {
              if (step.createdAt) {
                allSteps.push({
                  date: new Date(step.createdAt),
                  contractNumber: contract.number,
                });
              }
            });
          }
        });

        if (allSteps.length > 0) {
          const maxDate = Math.max(...allSteps.map((s) => s.date.getTime()));
          lastStepDate = dayjs(maxDate);
        }

        result.push({
          key: contractor.id || contractor.documentId,
          contractor,
          contracts: filteredContracts,
          contractsLength: filteredContracts.length,
          stepsLength: stepsCount,
          contractsNotSteps: contractsWithoutSteps,
          lastStepDate,
        });
      }
    });

    return result;
  }, [contractors, selectedFilial]);

  const sortedData = useMemo(() => {
    const data = [...processedData];

    if (sortLastStep) {
      return data.sort((a, b) => {
        if (!a.lastStepDate && !b.lastStepDate) return 0;
        if (!a.lastStepDate) return 1;
        if (!b.lastStepDate) return -1;
        return b.lastStepDate.unix() - a.lastStepDate.unix();
      });
    }

    return data.sort((a, b) =>
      a.contractor.name.localeCompare(b.contractor.name)
    );
  }, [processedData, sortLastStep]);

  const collapseItems = sortedData.map((item) => {
    const lastStepText = item.lastStepDate
      ? `Последний этап был добавлен: ${item.lastStepDate.format(
          "DD.MM.YYYY HH:mm"
        )}`
      : null;

    return {
      key: item.key,
      label: (
        <Flex gap={20} wrap style={{ alignItems: "center" }}>
          <Typography.Text strong style={{ flex: "1 0 200px" }}>
            {item.contractor.name}
          </Typography.Text>
          <Typography.Text style={{ flex: "0 0 auto" }}>
            Договоров:{" "}
            <span
              style={{
                fontWeight: 600,
                color: item.contractsLength === 0 ? "red" : "inherit",
              }}
            >
              {item.contractsLength}
            </span>
          </Typography.Text>
          <Typography.Text style={{ flex: "0 0 auto" }}>
            Договоров без этапов:{" "}
            <span
              style={{
                fontWeight: 600,
                color: item.contractsNotSteps > 0 ? "red" : "inherit",
              }}
            >
              {item.contractsNotSteps}
            </span>
          </Typography.Text>
          <Typography.Text style={{ flex: "0 0 auto" }}>
            Всего этапов:{" "}
            <span
              style={{
                fontWeight: 600,
                color: item.stepsLength === 0 ? "red" : "inherit",
              }}
            >
              {item.stepsLength}
            </span>
          </Typography.Text>
          {lastStepText && (
            <Typography.Text style={{ flex: "1 0 100%", marginTop: 4 }}>
              {lastStepText}
            </Typography.Text>
          )}
        </Flex>
      ),
      children: (
        <>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            Договоры:
          </Typography.Title>
          <List
            bordered
            dataSource={item.contracts}
            renderItem={(contract) => {
              const stepsCount = contract.steps?.length || 0;
              let contractLastStep = null;

              if (stepsCount > 0) {
                const maxStepDate = Math.max(
                  ...contract.steps.map((s) => new Date(s.createdAt).getTime())
                );
                if (isFinite(maxStepDate)) {
                  contractLastStep = dayjs(maxStepDate);
                }
              }

              return (
                <List.Item>
                  <Flex
                    gap={20}
                    wrap
                    style={{ width: "100%", alignItems: "center" }}
                  >
                    <a
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(contract.documentId);
                      }}
                      style={{ flex: "1 0 150px" }}
                    >
                      <Typography.Text style={{ color: "#1890ff" }}>
                        {contract.number}
                      </Typography.Text>
                    </a>
                    <Typography.Text style={{ flex: "0 0 auto" }}>
                      Этапов в договоре:{" "}
                      <span
                        style={{
                          fontWeight: 600,
                          color: stepsCount === 0 ? "red" : "inherit",
                        }}
                      >
                        {stepsCount}
                      </span>
                    </Typography.Text>
                    {contract.purpose && (
                      <Typography.Text style={{ flex: "0 0 auto" }}>
                        Назначение:{" "}
                        <Tag color={contract.purpose.color || "default"}>
                          {contract.purpose.name}
                        </Tag>
                      </Typography.Text>
                    )}
                    {contractLastStep && (
                      <Typography.Text style={{ flex: "0 0 auto" }}>
                        Последний этап:{" "}
                        {contractLastStep.format("DD.MM.YYYY HH:mm")}
                      </Typography.Text>
                    )}
                  </Flex>
                </List.Item>
              );
            }}
          />
        </>
      ),
    };
  });

  const totalStats = useMemo(() => {
    return {
      totalContractors: sortedData.length,
      totalContracts: sortedData.reduce(
        (acc, item) => acc + item.contractsLength,
        0
      ),
      totalSteps: sortedData.reduce((acc, item) => acc + item.stepsLength, 0),
    };
  }, [sortedData]);

  return (
    <div>
      {!loading && contractors && (
        <Flex vertical gap={10} style={{ marginBottom: 20 }}>
          <Typography.Text>
            Всего подрядчиков: {totalStats.totalContractors}
          </Typography.Text>
          <Typography.Text>
            Всего договоров (без кап. ремонта): {totalStats.totalContracts}
          </Typography.Text>
          <Typography.Text>
            Всего этапов: {totalStats.totalSteps}
          </Typography.Text>
          <Flex>
            <Checkbox
              checked={sortLastStep}
              onChange={(e) => setSortLastStep(e.target.checked)}
            >
              Сортировать по дате последнего добавления этапа
            </Checkbox>
          </Flex>
          <Flex align="center" gap={10}>
            <Typography.Text>Филиал:</Typography.Text>
            <Select
              style={{ minWidth: 240 }}
              value={selectedFilial}
              placeholder="Все"
              onChange={(val) => setSelectedFilial(val)}
              options={filials}
            />
          </Flex>
        </Flex>
      )}

      {!loading && collapseItems.length > 0 && (
        <Collapse items={collapseItems} style={{ marginBottom: 20 }} />
      )}

      {!loading && collapseItems.length === 0 && (
        <Flex justify="center" style={{ margin: 40 }}>
          <Typography.Text type="secondary">
            {selectedFilial === null
              ? "Нет данных для отображения"
              : `По выбранному филиалу договоров не найдено`}
          </Typography.Text>
        </Flex>
      )}

      {loading && (
        <Flex justify="center" style={{ margin: 40 }}>
          <Spin size="large" />
        </Flex>
      )}

      <ModalViewContract
        isOpenModal={isOpenModal}
        closeModal={closeModal}
        docIdForModal={docIdForModal}
      />
    </div>
  );
}

// import React, { useEffect, useState, useMemo } from "react";
// import useContractors from "../../store/useContractors";
// import { Checkbox, Collapse, Flex, List, Spin, Tag, Typography, Select } from "antd";
// import dayjs from "dayjs";
// import ModalViewContract from "./ModalViewContract";
// import { getAllFilials } from "../../lib/getData";

// export default function TableReport() {
//   const { contractors, find } = useContractors((store) => store);
//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [sortLastStep, setSortLastStep] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);
//   const [filials, setFilials] = useState([]);
//   const [selectedFilial, setSelectedFilial] = useState("all");
//   const [loading, setLoading] = useState(true);

//   const fetchFilials = async () => {
//     try {
//       const res = await getAllFilials(100, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: String(item.id),
//           label: item.name,
//         }));
//       temp.unshift({ value: "all", label: "Все" });
//       setFilials(temp);
//     } catch (e) {
//       console.error("fetchFilials error:", e);
//     }
//   };

//   useEffect(() => {
//     const loadData = async () => {
//       setLoading(true);
//       await Promise.all([find(), fetchFilials()]);
//       setLoading(false);
//     };
//     loadData();
//   }, []);

//   const openModal = (docId) => {
//     setDocIdForModal(docId);
//     setIsOpenModal(true);
//   };

//   const closeModal = () => {
//     setDocIdForModal(null);
//     setIsOpenModal(false);
//   };

//   // Функция для поиска филиала в договоре
//   const findFilialInContract = (contract) => {
//     if (!contract) return null;

//     // 1. Проверяем филиал договора
//     if (contract.filial && contract.filial.id) {
//       return contract.filial;
//     }

//     // 2. Проверяем филиал объектов капитального ремонта
//     if (contract.object_constructions && Array.isArray(contract.object_constructions)) {
//       for (const obj of contract.object_constructions) {
//         if (obj?.filial && obj.filial.id) {
//           return obj.filial;
//         }
//       }
//     }

//     // 3. Проверяем филиал в этапах
//     if (contract.steps && Array.isArray(contract.steps)) {
//       for (const step of contract.steps) {
//         if (step?.filial && step.filial.id) {
//           return step.filial;
//         }
//         if (step?.object?.filial && step.object.filial.id) {
//           return step.object.filial;
//         }
//       }
//     }

//     return null;
//   };

//   // Обработка и фильтрация данных
//   const processedData = useMemo(() => {
//     if (!contractors?.data || contractors.data.length === 0) return [];

//     const result = [];

//     contractors.data.forEach(contractor => {
//       // Фильтруем договоры подрядчика
//       const filteredContracts = (contractor.contracts || []).filter(contract => {
//         // Исключаем договоры с purpose.id = 49 (кап. ремонт)
//         if (contract.purpose?.id === 49) return false;

//         // Если выбрано "Все" филиалы, не фильтруем по филиалу
//         if (selectedFilial === "all") return true;

//         // Ищем филиал в договоре
//         const filial = findFilialInContract(contract);

//         // Если филиал не найден и выбрано "Все", включаем договор
//         if (!filial && selectedFilial === "all") return true;

//         // Если филиал не найден, исключаем договор
//         if (!filial) return false;

//         // Сравниваем id филиала (приводим к строке для сравнения)
//         return String(filial.id) === selectedFilial;
//       });

//       // Если после фильтрации есть договоры, добавляем подрядчика
//       if (filteredContracts.length > 0) {
//         const stepsCount = filteredContracts.reduce(
//           (acc, contract) => acc + (contract.steps?.length || 0),
//           0
//         );

//         const contractsWithoutSteps = filteredContracts.filter(
//           contract => !contract.steps || contract.steps.length === 0
//         ).length;

//         // Находим последний этап среди всех договоров
//         let lastStepDate = null;
//         const allSteps = [];

//         filteredContracts.forEach(contract => {
//           if (contract.steps && Array.isArray(contract.steps)) {
//             contract.steps.forEach(step => {
//               if (step.createdAt) {
//                 allSteps.push({
//                   date: new Date(step.createdAt),
//                   contractNumber: contract.number
//                 });
//               }
//             });
//           }
//         });

//         if (allSteps.length > 0) {
//           const maxDate = Math.max(...allSteps.map(s => s.date.getTime()));
//           lastStepDate = dayjs(maxDate);
//         }

//         result.push({
//           key: contractor.id || contractor.documentId,
//           contractor,
//           contracts: filteredContracts,
//           contractsLength: filteredContracts.length,
//           stepsLength: stepsCount,
//           contractsNotSteps: contractsWithoutSteps,
//           lastStepDate,
//           allSteps: allSteps
//         });
//       }
//     });

//     return result;
//   }, [contractors, selectedFilial]);

//   // Сортировка данных
//   const sortedData = useMemo(() => {
//     const data = [...processedData];

//     if (sortLastStep) {
//       return data.sort((a, b) => {
//         if (!a.lastStepDate && !b.lastStepDate) return 0;
//         if (!a.lastStepDate) return 1;
//         if (!b.lastStepDate) return -1;
//         return b.lastStepDate.unix() - a.lastStepDate.unix();
//       });
//     }

//     // Сортировка по имени подрядчика по умолчанию
//     return data.sort((a, b) => a.contractor.name.localeCompare(b.contractor.name));
//   }, [processedData, sortLastStep]);

//   // Формируем элементы для Collapse
//   const collapseItems = sortedData.map(item => {
//     const lastStepText = item.lastStepDate
//       ? `Последний этап был добавлен: ${item.lastStepDate.format("DD.MM.YYYY HH:mm")}`
//       : null;

//     return {
//       key: item.key,
//       label: (
//         <Flex gap={20} wrap style={{ alignItems: 'center' }}>
//           <Typography.Text strong style={{ flex: '1 0 200px' }}>
//             {item.contractor.name}
//           </Typography.Text>
//           <Typography.Text style={{ flex: '0 0 auto' }}>
//             Договоров:{" "}
//             <span style={{
//               fontWeight: 600,
//               color: item.contractsLength === 0 ? "red" : "inherit"
//             }}>
//               {item.contractsLength}
//             </span>
//           </Typography.Text>
//           <Typography.Text style={{ flex: '0 0 auto' }}>
//             Договоров без этапов:{" "}
//             <span style={{
//               fontWeight: 600,
//               color: item.contractsNotSteps > 0 ? "red" : "inherit"
//             }}>
//               {item.contractsNotSteps}
//             </span>
//           </Typography.Text>
//           <Typography.Text style={{ flex: '0 0 auto' }}>
//             Всего этапов:{" "}
//             <span style={{
//               fontWeight: 600,
//               color: item.stepsLength === 0 ? "red" : "inherit"
//             }}>
//               {item.stepsLength}
//             </span>
//           </Typography.Text>
//           {lastStepText && (
//             <Typography.Text style={{ flex: '1 0 100%', marginTop: 4 }}>
//               {lastStepText}
//             </Typography.Text>
//           )}
//         </Flex>
//       ),
//       children: (
//         <>
//           <Typography.Title level={5} style={{ marginBottom: 16 }}>
//             Договоры:
//           </Typography.Title>
//           <List
//             bordered
//             dataSource={item.contracts}
//             renderItem={contract => {
//               // Находим дату последнего этапа для этого договора
//               let contractLastStep = null;
//               if (contract.steps?.length > 0) {
//                 const maxStepDate = Math.max(
//                   ...contract.steps.map(s => new Date(s.createdAt).getTime())
//                 );
//                 if (isFinite(maxStepDate)) {
//                   contractLastStep = dayjs(maxStepDate);
//                 }
//               }

//               return (
//                 <List.Item>
//                   <Flex gap={20} wrap style={{ width: '100%' }}>
//                     <a
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         openModal(contract.documentId);
//                       }}
//                       style={{ flex: '1 0 150px' }}
//                     >
//                       <Typography.Text style={{ color: "#1890ff" }}>
//                         {contract.number}
//                       </Typography.Text>
//                     </a>
//                     <Typography.Text style={{ flex: '0 0 auto' }}>
//                       Этапов в договоре:{" "}
//                       <span style={{
//                         fontWeight: 600,
//                         color: contract.steps?.length === 0 ? "red" : "inherit"
//                       }}>
//                         {contract.steps?.length || 0}
//                       </span>
//                     </Typography.Text>
//                     {contract.purpose && (
//                       <Typography.Text style={{ flex: '0 0 auto' }}>
//                         Назначение:{" "}
//                         <Tag color={contract.purpose.color || "default"}>
//                           {contract.purpose.name}
//                         </Tag>
//                       </Typography.Text>
//                     )}
//                     {contractLastStep && (
//                       <Typography.Text style={{ flex: '1 0 100%', marginTop: 8 }}>
//                         Последний этап добавлен:{" "}
//                         {contractLastStep.format("DD.MM.YYYY HH:mm")}
//                       </Typography.Text>
//                     )}
//                   </Flex>
//                 </List.Item>
//               );
//             }}
//           />
//         </>
//       ),
//     };
//   });

//   // Общая статистика
//   const totalStats = useMemo(() => {
//     return {
//       totalContractors: sortedData.length,
//       totalContracts: sortedData.reduce((acc, item) => acc + item.contractsLength, 0),
//       totalSteps: sortedData.reduce((acc, item) => acc + item.stepsLength, 0),
//     };
//   }, [sortedData]);

//   return (
//     <div>
//       {!loading && contractors && (
//         <Flex vertical gap={10} style={{ marginBottom: 20 }}>
//           <Typography.Text>
//             Всего подрядчиков: {totalStats.totalContractors}
//           </Typography.Text>
//           <Typography.Text>
//             Всего договоров (без кап. ремонта): {totalStats.totalContracts}
//           </Typography.Text>
//           <Typography.Text>
//             Всего этапов: {totalStats.totalSteps}
//           </Typography.Text>
//           <Flex>
//             <Checkbox
//               checked={sortLastStep}
//               onChange={(e) => setSortLastStep(e.target.checked)}
//             >
//               Сортировать по дате последнего добавления этапа
//             </Checkbox>
//           </Flex>
//           <Flex align="center" gap={10}>
//             <Typography.Text>Филиал:</Typography.Text>
//             <Select
//               style={{ minWidth: 240 }}
//               value={selectedFilial}
//               placeholder="Все"
//               onChange={(val) => setSelectedFilial(val)}
//               options={filials}
//             />
//           </Flex>
//         </Flex>
//       )}

//       {!loading && collapseItems.length > 0 && (
//         <Collapse items={collapseItems} style={{ marginBottom: 20 }} />
//       )}

//       {!loading && collapseItems.length === 0 && (
//         <Flex justify="center" style={{ margin: 40 }}>
//           <Typography.Text type="secondary">
//             {selectedFilial === "all"
//               ? "Нет данных для отображения"
//               : `По выбранному филиалу договоров не найдено`}
//           </Typography.Text>
//         </Flex>
//       )}

//       {loading && (
//         <Flex justify="center" style={{ margin: 40 }}>
//           <Spin size="large" />
//         </Flex>
//       )}

//       <ModalViewContract
//         isOpenModal={isOpenModal}
//         closeModal={closeModal}
//         docIdForModal={docIdForModal}
//       />
//     </div>
//   );
// }

// import React, { useEffect, useState } from "react";
// import useContractors from "../../store/useContractors";
// import { Checkbox, Collapse, Flex, List, Spin, Tag, Typography, Select } from "antd";
// import dayjs from "dayjs";
// import ModalViewContract from "./ModalViewContract";
// import { getAllFilials } from "../../lib/getData";

// const extractFilial = (f) => {
//   if (!f) return null;
//   const src = f.data ?? f;
//   if (!src) return null;
//   return {
//     id: src.id != null ? String(src.id) : null,
//     documentId: src.documentId != null ? String(src.documentId) : null,
//     name: src.name ?? null,
//   };
// };

// const getFilialFromContract = (contract) => {
//   console.log("[getFilialFromContract] contract.number:", contract.number);
//   console.log("[getFilialFromContract] contract.filial:", contract.filial);

//   if (!contract) return null;

//   // 1. Филиал договора
//   const direct = extractFilial(contract.filial);
//   if (direct) {
//     console.log("[getFilialFromContract] FOUND direct filial", direct);
//     return direct;
//   }

//   // 2. Объекты капремонта
//   if (Array.isArray(contract.object_constructions)) {
//     for (const obj of contract.object_constructions) {
//       const f = extractFilial(obj?.filial);
//       if (f) {
//         console.log("[getFilialFromContract] FOUND object_construction filial", f);
//         return f;
//       }
//     }
//   }

//   // 3. Этапы
//   if (Array.isArray(contract.steps)) {
//     for (const step of contract.steps) {
//       const f1 = extractFilial(step?.filial);
//       if (f1) {
//         console.log("[getFilialFromContract] FOUND step.filial", f1);
//         return f1;
//       }

//       const f2 = extractFilial(step?.object?.filial);
//       if (f2) {
//         console.log("[getFilialFromContract] FOUND step.object.filial", f2);
//         return f2;
//       }
//     }
//   }

//   console.log("[getFilialFromContract] ❌ filial NOT FOUND ANYWHERE");
//   return null;
// };

// export default function TableReport() {
//   const { contractors, find } = useContractors((store) => store);
//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [sortLastStep, setSortLastStep] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);
//   const [filials, setFilials] = useState([]);
//   const [selectedFilial, setSelectedFilial] = useState(null);

//   const matchFilial = (contract) => {
//     if (!selectedFilial) {
//       console.log("[matchFilial] selectedFilial = null → true");
//       return true;
//     }

//     if (!contract) {
//       console.log("[matchFilial] contract is null/undefined");
//       return false;
//     }

//     const filial = getFilialFromContract(contract);

//     console.log("[matchFilial] contract.number:", contract.number);
//     console.log("[matchFilial] selectedFilial:", String(selectedFilial));
//     console.log("[matchFilial] extracted filial:", filial);

//     if (!filial) {
//       console.log("[matchFilial] ❌ filial NOT FOUND");
//       return false;
//     }

//     const match =
//       filial.id === String(selectedFilial) ||
//       filial.documentId === String(selectedFilial);

//     console.log("[matchFilial] ✅ match =", match);
//     return match;
//   };

//   const fetchFilials = async () => {
//     try {
//       const res = await getAllFilials(100, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: String(item.id),
//           label: item.name,
//         }));
//       temp.unshift({ value: "all", label: "Все" });
//       setFilials(temp);
//     } catch (e) {
//       console.error("fetchFilials error:", e);
//     }
//   };

//   useEffect(() => {
//     find();
//     fetchFilials();
//   }, []);

//   console.log("contractors", contractors);

//   const openModal = (docId) => {
//     setDocIdForModal(docId);
//     setIsOpenModal(true);
//   };
//   const closeModal = () => {
//     setDocIdForModal(null);
//     setIsOpenModal(false);
//   };
//   const items = contractors
//     ? contractors.data.map((item, index) => {
//         item.contractsLength = item.contracts
//           .filter((item) => item.purpose?.id != 49)
//           .filter((item) => matchFilial(item)).length;
//         item.stepsLength = item.contracts
//           .filter((item) => item.purpose?.id != 49)
//           .filter((item) => matchFilial(item))
//           .reduce(
//             (accumulator, currentValue) =>
//               accumulator + currentValue.steps.length,
//             0
//           );
//         item.contractsNotSteps = item.contracts
//           .filter((item) => item.purpose?.id != 49)
//           .filter((item) => matchFilial(item))
//           .reduce((accumulator, currentValue) => {
//             if (currentValue.steps.length == 0) {
//               return accumulator + 1;
//             } else {
//               return accumulator;
//             }
//           }, 0);
//         const steps = item.contracts
//           .filter((item) => item.purpose?.id != 49)
//           .filter((item) => matchFilial(item))
//           .flatMap((item) => item.steps);

//         item.lastStepDate = steps.length
//           ? dayjs(Math.max(...steps.map((s) => new Date(s.createdAt))))
//           : null;
//         if (item.contractsLength) {
//           return {
//             key: index,
//             label: (
//               <Flex gap={20}>
//                 <Typography.Text style={{ fontWeight: 700 }}>
//                   {item.name}
//                 </Typography.Text>
//                 <Typography.Text>
//                   Договоров:{" "}
//                   <span
//                     style={{
//                       fontWeight: 600,
//                       color: item.contractsLength == 0 ? "red" : undefined,
//                     }}
//                   >
//                     {item.contractsLength}
//                   </span>
//                 </Typography.Text>
//                 <Typography.Text>
//                   Договоров без этапов:{" "}
//                   <span
//                     style={{
//                       fontWeight: 600,
//                       color: item.contractsNotSteps > 0 ? "red" : undefined,
//                     }}
//                   >
//                     {item.contractsNotSteps}
//                   </span>
//                 </Typography.Text>
//                 <Typography.Text>
//                   Всего этапов:{" "}
//                   <span
//                     style={{
//                       fontWeight: 600,
//                       color: item.stepsLength == 0 ? "red" : undefined,
//                     }}
//                   >
//                     {item.stepsLength}
//                   </span>
//                 </Typography.Text>
//                 {item.stepsLength > 0 && item.lastStepDate && (
//                   <Typography.Text>
//                     Последний этап был добавлен:{" "}
//                     {item.lastStepDate.format("DD.MM.YYYY HH:mm")}
//                   </Typography.Text>
//                 )}
//               </Flex>
//             ),
//             children: (
//               <>
//                 <Typography.Title level={5}>Договоры:</Typography.Title>
//                 <List
//                   // header={<div>Header</div>}
//                   // footer={<div>Footer</div>}
//                   bordered
//                   dataSource={item.contracts
//                     .filter((item) => item.purpose?.id != 49)
//                     .filter((item) => matchFilial(item))
//                   }
//                   renderItem={(item) => {
//                     const lastStep = dayjs(
//                       Math.max.apply(
//                         Math,
//                         item.steps.map((item) => new Date(item.createdAt))
//                       )
//                     );
//                     console.log("lastStep", lastStep);

//                     return (
//                       <List.Item>
//                         {/* <Typography.Text mark>[ITEM]</Typography.Text>  */}
//                         <Flex gap={20}>
//                           <a
//                             onClick={() => {
//                               openModal(item.documentId);
//                             }}
//                           >
//                             <Typography.Text style={{ color: "blue" }}>
//                               {item.number}
//                             </Typography.Text>
//                           </a>
//                           <Typography.Text>
//                             Этапов в договоре:{" "}
//                             <span
//                               style={{
//                                 fontWeight: 600,
//                                 color:
//                                   item.steps.length == 0 ? "red" : undefined,
//                               }}
//                             >
//                               {item.steps.length}
//                             </span>
//                           </Typography.Text>
//                           <Typography.Text>
//                             Назначение:{" "}
//                             <Tag color={item.purpose.color}>
//                               {item.purpose.name}
//                             </Tag>
//                           </Typography.Text>
//                           {item.steps.length > 0 && (
//                             <Typography.Text>
//                               Последний этап добавлен:{" "}
//                               {lastStep.format("DD.MM.YYYY HH:mm")}
//                             </Typography.Text>
//                           )}
//                         </Flex>
//                       </List.Item>
//                     );
//                   }}
//                 />
//               </>
//             ),
//             laststepdate: item.lastStepDate,
//           };
//         } else {
//           return false;
//         }
//       })
//     : [];
//   return (
//     <div>
//       {items.length != 0 && (
//         <Flex vertical gap={10} style={{ marginBottom: 20 }}>
//           <Typography.Text>
//             Всего подрядчиков: {items?.filter((item) => item).length}
//           </Typography.Text>
//           <Typography.Text>
//             Всего договоров (без кап. ремонта):{" "}
//             {contractors?.data.reduce(
//               (acc, curr) =>
//                 acc +
//                 curr.contracts
//                   .filter((item) => item.purpose?.id != 49)
//                   .filter((item) => matchFilial(item)).length,
//               0
//             )}
//           </Typography.Text>
//           <Flex>
//             <Checkbox
//               checked={sortLastStep}
//               onChange={(e) => {
//                 setSortLastStep(e.target.checked);
//               }}
//             >
//               Сортировать по дате последнего добавления этапа
//             </Checkbox>
//           </Flex>
//           <Flex align="center" gap={10}>
//             <Typography.Text>Филиал:</Typography.Text>
//             <Select
//               style={{ minWidth: 240 }}
//               value={selectedFilial}
//               placeholder="Все"
//               allowClear
//               onChange={(val) => setSelectedFilial(val === "all" ? null : val)}
//               options={filials}
//             />
//           </Flex>
//         </Flex>
//       )}
//       <Collapse
//         style={{ marginBottom: 20 }}
//         items={items
//           .sort((a, b) => {
//             if (sortLastStep) {
//               console.log(isNaN(dayjs(b.laststepdate).unix()));
//               if (!a.laststepdate) return 1;
//               if (!b.laststepdate) return -1;
//               if (dayjs(a.laststepdate).unix() === dayjs(b.laststepdate).unix())
//                 return 0;
//               return dayjs(a.laststepdate).unix() > dayjs(b.laststepdate).unix()
//                 ? -1
//                 : 1;
//             }

//             // return !!a.laststepdate - !!b.laststepdate || dayjs(b.laststepdate).subtract(a.laststepdate).unix()
//           })
//           .filter((item) => item)}
//       />
//       <ModalViewContract
//         isOpenModal={isOpenModal}
//         closeModal={closeModal}
//         docIdForModal={docIdForModal}
//         // update={handlerReload}
//       />
//       {contractors === null && (
//         <Flex justify="center" style={{ margin: 40 }}>
//           <Spin size="large" />
//         </Flex>
//       )}
//     </div>
//   );
// }
