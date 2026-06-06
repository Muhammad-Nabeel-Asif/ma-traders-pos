import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  InputNumber,
  Input,
  Button,
  Table,
  Typography,
  Statistic,
  Space,
  App as AntApp,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api, apiError } from '../lib/api';
import { useAccounts } from '../lib/queries';
import { formatPKR, toPaisa } from '../lib/money';

const { Title, Text } = Typography;

export default function CashVoucher({ type }: { type: 'RECEIVE' | 'PAYMENT' }) {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const { data: accounts } = useAccounts();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [accountId, setAccountId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [narration, setNarration] = useState('');

  const account = (accounts ?? []).find((a) => a.id === accountId);

  const list = useQuery({
    queryKey: ['cash', type],
    queryFn: async () =>
      (await api.get('/cash-vouchers', { params: { type } })).data,
  });

  const save = useMutation({
    mutationFn: async () =>
      api.post('/cash-vouchers', {
        type,
        date: date.format('YYYY-MM-DD'),
        accountId,
        amount: toPaisa(amount),
        narration,
      }),
    onSuccess: () => {
      message.success('Voucher saved');
      setAmount(0);
      setNarration('');
      qc.invalidateQueries({ queryKey: ['cash', type] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e) => message.error(apiError(e)),
  });

  const submit = () => {
    if (!accountId) return message.warning('Select an account');
    if (!amount || amount <= 0) return message.warning('Enter an amount');
    save.mutate();
  };

  const heading = type === 'RECEIVE' ? 'Cash Receive' : 'Cash Payment';

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        {heading}
      </Title>
      <Row gutter={16}>
        <Col xs={24} md={9}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Text type="secondary">Date</Text>
                <DatePicker
                  value={date}
                  onChange={(d) => d && setDate(d)}
                  allowClear={false}
                  format="DD/MM/YYYY"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Text type="secondary">Account</Text>
                <Select
                  showSearch
                  placeholder="Search account"
                  style={{ width: '100%' }}
                  value={accountId ?? undefined}
                  optionFilterProp="label"
                  onChange={setAccountId}
                  options={(accounts ?? []).map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.code})`,
                  }))}
                />
              </div>
              {account && (
                <Statistic
                  title="Current Balance"
                  value={formatPKR(account.balance ?? 0)}
                  valueStyle={{ fontSize: 16 }}
                />
              )}
              <div>
                <Text type="secondary">Amount (PKR)</Text>
                <InputNumber
                  min={0}
                  value={amount}
                  onChange={(v) => setAmount(Number(v ?? 0))}
                  style={{ width: '100%' }}
                  step={100}
                />
              </div>
              <div>
                <Text type="secondary">Narration</Text>
                <Input.TextArea
                  rows={2}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={save.isPending}
                onClick={submit}
                block
              >
                Save {heading}
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={15}>
          <Card size="small" title={`Recent ${heading} Vouchers`}>
            <Table
              rowKey="id"
              size="small"
              loading={list.isLoading}
              dataSource={list.data}
              columns={[
                { title: 'V #', dataIndex: 'voucherNo', width: 70 },
                {
                  title: 'Date',
                  dataIndex: 'date',
                  width: 110,
                  render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
                },
                { title: 'Account', dataIndex: 'accountName' },
                { title: 'Narration', dataIndex: 'narration' },
                {
                  title: 'Amount',
                  dataIndex: 'amount',
                  width: 130,
                  align: 'right',
                  render: (v: number) => formatPKR(v),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
