import { useState } from 'react';
import {
  Card,
  Select,
  Table,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Statistic,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useSalesmen } from '../../lib/queries';
import { formatPKR } from '../../lib/money';

const { Title, Text } = Typography;

export default function SalesmanLedger() {
  const { data: salesmen } = useSalesmen();
  const [salesmanId, setSalesmanId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['salesman-ledger', salesmanId],
    enabled: !!salesmanId,
    queryFn: async () =>
      (await api.get(`/reports/salesman-ledger/${salesmanId}`)).data,
  });

  return (
    <Card>
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Salesman Ledger
        </Title>
        <Space>
          <Select
            showSearch
            placeholder="Select salesman"
            style={{ width: 260 }}
            value={salesmanId ?? undefined}
            optionFilterProp="label"
            onChange={setSalesmanId}
            options={(salesmen ?? []).map((s) => ({ value: s.id, label: s.name }))}
          />
          <Button icon={<PrinterOutlined />} disabled={!data} onClick={() => window.print()}>
            Print
          </Button>
        </Space>
      </div>

      {data && (
        <div className="print-area">
          <Title level={5} style={{ marginTop: 0 }}>
            {data.salesman.name}
          </Title>
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col>
              <Statistic title="Credit Limit" value={formatPKR(data.creditLimit)} />
            </Col>
            <Col>
              <Statistic
                title="Outstanding"
                value={formatPKR(data.outstanding)}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col>
              <Statistic
                title="Available"
                value={formatPKR(data.available)}
                valueStyle={{ color: data.available < 0 ? '#cf1322' : '#389e0d' }}
              />
            </Col>
          </Row>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading}
            dataSource={data.customers}
            pagination={false}
            columns={[
              { title: 'Code', dataIndex: 'code', width: 120 },
              { title: 'Customer', dataIndex: 'name' },
              {
                title: 'Balance',
                dataIndex: 'balance',
                width: 160,
                align: 'right',
                render: (v: number) => formatPKR(v),
              },
            ]}
          />
        </div>
      )}
      {!salesmanId && <Text type="secondary">Select a salesman to view their customers and exposure.</Text>}
    </Card>
  );
}
