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
  Divider,
} from "antd";
import { SwapOutlined, FilterOutlined } from "@ant-design/icons";
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
  const [statusFilter, setStatusFilter] = useState("work");

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

          if (statusFilter === "work" && contract.completed) return false;
          if (statusFilter === "archive" && !contract.completed) return false;

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
  }, [contractors, selectedFilial, statusFilter]);

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
          
             {/* Фильтры */}
          <Flex vertical gap={6}>
            <Flex align="center" gap={8}>
              <FilterOutlined style={{ color: "#52c41a" }} />
              <Typography.Text strong>Фильтры</Typography.Text>
            </Flex>

            <Flex wrap align="center" gap={24}>
              <Flex align="center" gap={10}>
                <Typography.Text>Статус:</Typography.Text>
                <Select
                  style={{ minWidth: 200 }}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={[
                    { value: "all", label: "Все" },
                    { value: "work", label: "В работе" },
                    { value: "archive", label: "Архивный" },
                  ]}
                />
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
          </Flex>
          <Divider style={{ margin: "8px 0" }} />
       

          {/* Сортировки */}
          <Flex vertical gap={6}>
            <Flex align="center" gap={8}>
              <SwapOutlined style={{ color: "#1677ff" }} />
              <Typography.Text strong>Сортировка</Typography.Text>
            </Flex>
            <Checkbox
              checked={sortLastStep}
              onChange={(e) => setSortLastStep(e.target.checked)}
            >
              По дате последнего добавления этапа
            </Checkbox>
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
// import {
//   Checkbox,
//   Collapse,
//   Flex,
//   List,
//   Spin,
//   Tag,
//   Typography,
//   Select,
//   Divider,
// } from "antd";
// import {
//   SwapOutlined,
//   FilterOutlined,
// } from "@ant-design/icons";
// import dayjs from "dayjs";
// import ModalViewContract from "./ModalViewContract";
// import { getAllFilials } from "../../lib/getData";

// export default function TableReport() {
//   const { contractors, find } = useContractors((store) => store);
//   const [isOpenModal, setIsOpenModal] = useState(false);
//   const [sortLastStep, setSortLastStep] = useState(false);
//   const [docIdForModal, setDocIdForModal] = useState(null);
//   const [filials, setFilials] = useState([]);
//   const [selectedFilial, setSelectedFilial] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [onlyAtWork, setOnlyAtWork] = useState(true);

//   const fetchFilials = async () => {
//     try {
//       const res = await getAllFilials(100, 1);
//       const temp = res.data
//         .sort((a, b) => a.name.localeCompare(b.name))
//         .map((item) => ({
//           value: item.id,
//           label: item.name,
//         }));
//       temp.unshift({ value: null, label: "Все" });
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

//   const matchFilial = (contract, selectedFilialId) => {
//     if (selectedFilialId === null) {
//       return true;
//     }

//     if (!contract || !contract.filial) {
//       return false;
//     }

//     return (
//       contract.filial.id === selectedFilialId ||
//       contract.filial?.documentId === selectedFilialId
//     );
//   };

//   const processedData = useMemo(() => {
//     if (!contractors?.data || contractors.data.length === 0) return [];

//     const result = [];

//     contractors.data.forEach((contractor) => {
//       const filteredContracts = (contractor.contracts || []).filter(
//         (contract) => {
//           if (contract.purpose?.id === 49) return false;

//           if (onlyAtWork && contract.completed) return false;

//           return matchFilial(contract, selectedFilial);
//         }
//       );

//       if (filteredContracts.length > 0) {
//         const stepsCount = filteredContracts.reduce(
//           (acc, contract) => acc + (contract.steps?.length || 0),
//           0
//         );

//         const contractsWithoutSteps = filteredContracts.filter(
//           (contract) => !contract.steps || contract.steps.length === 0
//         ).length;

//         let lastStepDate = null;
//         const allSteps = [];

//         filteredContracts.forEach((contract) => {
//           if (contract.steps && Array.isArray(contract.steps)) {
//             contract.steps.forEach((step) => {
//               if (step.createdAt) {
//                 allSteps.push({
//                   date: new Date(step.createdAt),
//                   contractNumber: contract.number,
//                 });
//               }
//             });
//           }
//         });

//         if (allSteps.length > 0) {
//           const maxDate = Math.max(...allSteps.map((s) => s.date.getTime()));
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
//         });
//       }
//     });

//     return result;
//   }, [contractors, selectedFilial, onlyAtWork]);

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

//     return data.sort((a, b) =>
//       a.contractor.name.localeCompare(b.contractor.name)
//     );
//   }, [processedData, sortLastStep]);

//   const collapseItems = sortedData.map((item) => {
//     const lastStepText = item.lastStepDate
//       ? `Последний этап был добавлен: ${item.lastStepDate.format(
//           "DD.MM.YYYY HH:mm"
//         )}`
//       : null;

//     return {
//       key: item.key,
//       label: (
//         <Flex gap={20} wrap style={{ alignItems: "center" }}>
//           <Typography.Text strong style={{ flex: "1 0 200px" }}>
//             {item.contractor.name}
//           </Typography.Text>
//           <Typography.Text style={{ flex: "0 0 auto" }}>
//             Договоров:{" "}
//             <span
//               style={{
//                 fontWeight: 600,
//                 color: item.contractsLength === 0 ? "red" : "inherit",
//               }}
//             >
//               {item.contractsLength}
//             </span>
//           </Typography.Text>
//           <Typography.Text style={{ flex: "0 0 auto" }}>
//             Договоров без этапов:{" "}
//             <span
//               style={{
//                 fontWeight: 600,
//                 color: item.contractsNotSteps > 0 ? "red" : "inherit",
//               }}
//             >
//               {item.contractsNotSteps}
//             </span>
//           </Typography.Text>
//           <Typography.Text style={{ flex: "0 0 auto" }}>
//             Всего этапов:{" "}
//             <span
//               style={{
//                 fontWeight: 600,
//                 color: item.stepsLength === 0 ? "red" : "inherit",
//               }}
//             >
//               {item.stepsLength}
//             </span>
//           </Typography.Text>
//           {lastStepText && (
//             <Typography.Text style={{ flex: "1 0 100%", marginTop: 4 }}>
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
//             renderItem={(contract) => {
//               const stepsCount = contract.steps?.length || 0;
//               let contractLastStep = null;

//               if (stepsCount > 0) {
//                 const maxStepDate = Math.max(
//                   ...contract.steps.map((s) => new Date(s.createdAt).getTime())
//                 );
//                 if (isFinite(maxStepDate)) {
//                   contractLastStep = dayjs(maxStepDate);
//                 }
//               }

//               return (
//                 <List.Item>
//                   <Flex
//                     gap={20}
//                     wrap
//                     style={{ width: "100%", alignItems: "center" }}
//                   >
//                     <a
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         openModal(contract.documentId);
//                       }}
//                       style={{ flex: "1 0 150px" }}
//                     >
//                       <Typography.Text style={{ color: "#1890ff" }}>
//                         {contract.number}
//                       </Typography.Text>
//                     </a>
//                     <Typography.Text style={{ flex: "0 0 auto" }}>
//                       Этапов в договоре:{" "}
//                       <span
//                         style={{
//                           fontWeight: 600,
//                           color: stepsCount === 0 ? "red" : "inherit",
//                         }}
//                       >
//                         {stepsCount}
//                       </span>
//                     </Typography.Text>
//                     {contract.purpose && (
//                       <Typography.Text style={{ flex: "0 0 auto" }}>
//                         Назначение:{" "}
//                         <Tag color={contract.purpose.color || "default"}>
//                           {contract.purpose.name}
//                         </Tag>
//                       </Typography.Text>
//                     )}
//                     {contractLastStep && (
//                       <Typography.Text style={{ flex: "0 0 auto" }}>
//                         Последний этап:{" "}
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

//   const totalStats = useMemo(() => {
//     return {
//       totalContractors: sortedData.length,
//       totalContracts: sortedData.reduce(
//         (acc, item) => acc + item.contractsLength,
//         0
//       ),
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
//           <Flex vertical gap={6}>
//             <Flex align="center" gap={8}>
//               <SwapOutlined style={{ color: "#1677ff" }} />
//               <Typography.Text strong>Сортировка</Typography.Text>
//             </Flex>
//             <Checkbox
//               checked={sortLastStep}
//               onChange={(e) => setSortLastStep(e.target.checked)}
//             >
//               По дате последнего добавления этапа
//             </Checkbox>
//           </Flex>

//           <Divider style={{ margin: "8px 0" }} />

//           <Flex vertical gap={6}>
//             <Flex align="center" gap={8}>
//               <FilterOutlined style={{ color: "#52c41a" }} />
//               <Typography.Text strong>Фильтры</Typography.Text>
//             </Flex>
//             <Checkbox
//               checked={onlyAtWork}
//               onChange={(e) => setOnlyAtWork(e.target.checked)}
//             >
//               Договоры в работе
//             </Checkbox>

//             <Flex align="center" gap={10}>
//               <Typography.Text>Филиал:</Typography.Text>
//               <Select
//                 style={{ minWidth: 240 }}
//                 value={selectedFilial}
//                 placeholder="Все"
//                 onChange={(val) => setSelectedFilial(val)}
//                 options={filials}
//               />
//             </Flex>
//           </Flex>
//         </Flex>
//       )}

//       {!loading && collapseItems.length > 0 && (
//         <Collapse items={collapseItems} style={{ marginBottom: 20 }} />
//       )}

//       {!loading && collapseItems.length === 0 && (
//         <Flex justify="center" style={{ margin: 40 }}>
//           <Typography.Text type="secondary">
//             {selectedFilial === null
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
