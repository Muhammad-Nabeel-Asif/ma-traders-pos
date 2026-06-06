import { useState } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatPKR } from '../../lib/money';

const { Title } = Typography;

export default function AllBalance() {
  const [type, setType] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['all-balance', type],
    queryFn: async () =>
      (await api.get('/reports/all-balance', { params: { type } })).data,
  });

  return (
    <Card>
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          All Balances
        </Title>
        <Space>
          <Select
            allowClear
            placeholder="All types"
            style={{ width: 180 }}
            value={type}
            onChange={setType}
            options={[
              { value: 'customer', label: 'Customers' },
              { value: 'supplier', label: 'Suppliers' },
              { value: 'cash', label: 'Cash' },
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
        </Space>
      </div>

      <div className="print-area">
        <Row gutter={16} style={{ marginBottom: 12 }}>
          <Col>
            <Statistic
              title="Total Receivable"
              value={formatPKR(data?.totalDebit ?? 0)}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col>
            <Statistic
              title="Total Payable / Credit"
              value={formatPKR(data?.totalCredit ?? 0)}
              valueStyle={{ color: '#389e0d' }}
            />
          </Col>
        </Row>
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={data?.accounts}
          pagination={false}
          columns={[
            { title: 'Code', dataIndex: 'code', width: 110 },
            { title: 'Name', dataIndex: 'name' },
            { title: 'Type', dataIndex: 'type', width: 110 },
            { title: 'Town', dataIndex: 'town', width: 140 },
            {
              title: 'Balance',
              dataIndex: 'balance',
              width: 150,
              align: 'right',
              render: (v: number) => (
                <span style={{ color: v > 0 ? '#cf1322' : v < 0 ? '#389e0d' : undefined }}>
                  {formatPKR(v)}
                </span>
              ),
            },
          ]}
        />
      </div>
    </Card>
  );
}
