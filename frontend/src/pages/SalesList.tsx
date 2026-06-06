import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  DatePicker,
  Space,
  Button,
  Modal,
} from 'antd';
import { PrinterOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../lib/api';
import { formatPKR } from '../lib/money';
import InvoicePrint from '../components/InvoicePrint';
import type { SaleListRow } from '../lib/types';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function SalesList() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [viewing, setViewing] = useState<any>(null);

  const params: Record<string, string> = {};
  if (range) {
    params.from = range[0].format('YYYY-MM-DD');
    params.to = range[1].format('YYYY-MM-DD');
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sales', params],
    queryFn: async () => (await api.get<SaleListRow[]>('/sales', { params })).data,
  });

  const view = async (id: number) => {
    const { data } = await api.get(`/sales/${id}`);
    setViewing(data);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Sales / Invoices
        </Title>
        <Space>
          <RangePicker
            format="DD/MM/YYYY"
            onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          />
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Inv #', dataIndex: 'invoiceNo', width: 90 },
          {
            title: 'Date',
            dataIndex: 'date',
            width: 120,
            render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
          },
          { title: 'Account', dataIndex: 'accountName' },
          {
            title: 'Mode',
            dataIndex: 'paymentMode',
            width: 90,
            render: (m: string) => <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m}</Tag>,
          },
          {
            title: 'Invoice Total',
            dataIndex: 'invoiceTotal',
            width: 140,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Net Balance',
            dataIndex: 'netTotal',
            width: 140,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Actions',
            width: 100,
            render: (_, r: SaleListRow) => (
              <Button size="small" icon={<EyeOutlined />} onClick={() => view(r.id)}>
                View
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={!!viewing}
        onCancel={() => setViewing(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setViewing(null)}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Print
          </Button>,
        ]}
      >
        {viewing && (
          <div className="print-area">
            <InvoicePrint
              invoice={viewing.invoice}
              items={viewing.items}
              account={viewing.account}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
}
