import { Card, Col, Row, Statistic, Typography, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { api } from '../lib/api';
import { formatPKR } from '../lib/money';
import type { SaleListRow } from '../lib/types';

const { Title } = Typography;

export default function Dashboard() {
  const today = dayjs().format('YYYY-MM-DD');

  const daily = useQuery({
    queryKey: ['daily', today],
    queryFn: async () =>
      (await api.get(`/reports/daily`, { params: { date: today } })).data,
  });

  const recentSales = useQuery({
    queryKey: ['recent-sales'],
    queryFn: async () => (await api.get<SaleListRow[]>('/sales')).data,
  });

  const summary = daily.data?.summary ?? {};

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        Dashboard
      </Title>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={formatPKR(summary.totalSales ?? 0)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Cash Received Today"
              value={formatPKR(summary.received ?? 0)}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Invoices Today" value={summary.invoiceCount ?? 0} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Credit Sales Today"
              value={formatPKR(summary.creditSales ?? 0)}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Invoices" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          size="small"
          loading={recentSales.isLoading}
          dataSource={(recentSales.data ?? []).slice(0, 10)}
          pagination={false}
          columns={[
            { title: 'Inv #', dataIndex: 'invoiceNo', width: 90 },
            { title: 'Date', dataIndex: 'date', width: 120 },
            { title: 'Account', dataIndex: 'accountName' },
            {
              title: 'Mode',
              dataIndex: 'paymentMode',
              width: 90,
              render: (m: string) => (
                <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m}</Tag>
              ),
            },
            {
              title: 'Total',
              dataIndex: 'invoiceTotal',
              width: 130,
              align: 'right',
              render: (v: number) => formatPKR(v),
            },
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <Link to="/sales">View all invoices</Link>
        </div>
      </Card>
    </div>
  );
}
