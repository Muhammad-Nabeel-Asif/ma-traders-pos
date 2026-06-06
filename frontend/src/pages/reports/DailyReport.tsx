import { useState } from 'react';
import {
  Card,
  DatePicker,
  Table,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';
import { formatPKR } from '../../lib/money';

const { Title } = Typography;

export default function DailyReport() {
  const [date, setDate] = useState<Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['daily', date.format('YYYY-MM-DD')],
    queryFn: async () =>
      (await api.get('/reports/daily', { params: { date: date.format('YYYY-MM-DD') } })).data,
  });

  const s = data?.summary ?? {};

  return (
    <Card>
      <div
        className="no-print"
        style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Daily Report
        </Title>
        <Space>
          <DatePicker
            value={date}
            onChange={(d) => d && setDate(d)}
            allowClear={false}
            format="DD/MM/YYYY"
          />
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print
          </Button>
        </Space>
      </div>

      <div className="print-area">
        <Title level={5} style={{ marginTop: 0 }} className="print-only">
          Daily Report - {date.format('DD/MM/YYYY')}
        </Title>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} md={5}>
            <Statistic title="Total Sales" value={formatPKR(s.totalSales ?? 0)} />
          </Col>
          <Col xs={12} md={5}>
            <Statistic title="Cash Sales" value={formatPKR(s.cashSales ?? 0)} />
          </Col>
          <Col xs={12} md={5}>
            <Statistic title="Credit Sales" value={formatPKR(s.creditSales ?? 0)} />
          </Col>
          <Col xs={12} md={5}>
            <Statistic title="Cash Received" value={formatPKR(s.received ?? 0)} />
          </Col>
          <Col xs={12} md={4}>
            <Statistic title="Invoices" value={s.invoiceCount ?? 0} />
          </Col>
        </Row>

        <Title level={5}>Invoices</Title>
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          dataSource={data?.sales}
          pagination={false}
          style={{ marginBottom: 16 }}
          columns={[
            { title: 'Inv #', dataIndex: 'invoiceNo', width: 90 },
            { title: 'Account', dataIndex: 'accountName' },
            {
              title: 'Mode',
              dataIndex: 'paymentMode',
              width: 90,
              render: (m: string) => <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m}</Tag>,
            },
            {
              title: 'Total',
              dataIndex: 'invoiceTotal',
              width: 140,
              align: 'right',
              render: (v: number) => formatPKR(v),
            },
          ]}
        />

        <Title level={5}>Cash Vouchers</Title>
        <Table
          rowKey="id"
          size="small"
          dataSource={data?.vouchers}
          pagination={false}
          columns={[
            { title: 'V #', dataIndex: 'voucherNo', width: 80 },
            {
              title: 'Type',
              dataIndex: 'type',
              width: 110,
              render: (t: string) => (
                <Tag color={t === 'RECEIVE' ? 'green' : 'volcano'}>{t}</Tag>
              ),
            },
            { title: 'Account', dataIndex: 'accountName' },
            {
              title: 'Amount',
              dataIndex: 'amount',
              width: 140,
              align: 'right',
              render: (v: number) => formatPKR(v),
            },
          ]}
        />
      </div>
    </Card>
  );
}
