import { useState } from 'react';
import {
  Card,
  Select,
  DatePicker,
  Table,
  Typography,
  Space,
  Button,
  Statistic,
  Row,
  Col,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';
import { useAccounts } from '../../lib/queries';
import { formatPaisa, formatPKR } from '../../lib/money';
import type { LedgerEntry } from '../../lib/types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function Ledger() {
  const { data: accounts } = useAccounts();
  const [accountId, setAccountId] = useState<number | null>(null);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const params: Record<string, string> = {};
  if (range) {
    params.from = range[0].format('YYYY-MM-DD');
    params.to = range[1].format('YYYY-MM-DD');
  }

  const { data, isLoading } = useQuery({
    queryKey: ['ledger', accountId, params],
    enabled: !!accountId,
    queryFn: async () =>
      (await api.get(`/reports/ledger/${accountId}`, { params })).data,
  });

  return (
    <Card>
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Account Ledger
        </Title>
        <Space>
          <Select
            showSearch
            placeholder="Select account"
            style={{ width: 280 }}
            value={accountId ?? undefined}
            optionFilterProp="label"
            onChange={setAccountId}
            options={(accounts ?? []).map((a) => ({
              value: a.id,
              label: `${a.name} (${a.code})`,
            }))}
          />
          <RangePicker format="DD/MM/YYYY" onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
          <Button
            icon={<PrinterOutlined />}
            disabled={!data}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Space>
      </div>

      {data && (
        <div className="print-area">
          <div style={{ marginBottom: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              {data.account.name} ({data.account.code})
            </Title>
            <Text type="secondary">{data.account.address}</Text>
          </div>
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col>
              <Statistic title="Opening" value={formatPaisa(data.openingBalance)} />
            </Col>
            <Col>
              <Statistic
                title="Closing"
                value={formatPaisa(data.closingBalance)}
                valueStyle={{ color: '#1565c0' }}
              />
            </Col>
          </Row>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading}
            dataSource={data.entries as LedgerEntry[]}
            pagination={false}
            columns={[
              {
                title: 'Date',
                dataIndex: 'date',
                width: 110,
                render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
              },
              { title: 'Type', dataIndex: 'refType', width: 130 },
              { title: 'Narration', dataIndex: 'narration' },
              {
                title: 'Debit',
                dataIndex: 'debit',
                width: 120,
                align: 'right',
                render: (v: number) => (v ? formatPaisa(v) : '-'),
              },
              {
                title: 'Credit',
                dataIndex: 'credit',
                width: 120,
                align: 'right',
                render: (v: number) => (v ? formatPaisa(v) : '-'),
              },
              {
                title: 'Balance',
                dataIndex: 'balance',
                width: 130,
                align: 'right',
                render: (v: number) => formatPaisa(v),
              },
            ]}
          />
        </div>
      )}
      {!accountId && <Text type="secondary">Select an account to view its ledger.</Text>}
      {accountId && data && (
        <div className="no-print" style={{ marginTop: 8 }}>
          <Text strong>Closing Balance: {formatPKR(data.closingBalance)}</Text>
        </div>
      )}
    </Card>
  );
}
