import { useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  DatePicker,
  Select,
  Input,
  InputNumber,
  Button,
  Table,
  Statistic,
  Space,
  Radio,
  Switch,
  Modal,
  Typography,
  App as AntApp,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  PrinterOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api, apiError } from '../lib/api';
import { useAccounts, useProducts, useSalesmen } from '../lib/queries';
import {
  formatPKR,
  formatPaisa,
  toPaisa,
  toRupees,
  computeLineTotalPaisa,
} from '../lib/money';
import InvoicePrint from '../components/InvoicePrint';
import type { Account, Product } from '../lib/types';

const { Title, Text } = Typography;

interface Line {
  key: string;
  productId: number | null;
  sch: number;
  schemeFree: number;
  ctn: number;
  box: number;
  safi: number;
  freeQty: number;
  rate: number; // rupees
  discPct: number;
  discRs: number; // rupees
}

const emptyLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  productId: null,
  sch: 0,
  schemeFree: 0,
  ctn: 0,
  box: 0,
  safi: 0,
  freeQty: 0,
  rate: 0,
  discPct: 0,
  discRs: 0,
});

export default function Sale() {
  const { message } = AntApp.useApp();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [accountId, setAccountId] = useState<number | null>(null);
  const [salesmanId, setSalesmanId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CREDIT'>('CREDIT');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [descript, setDescript] = useState('SALE');
  const [claimable, setClaimable] = useState(false);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: accounts } = useAccounts();
  const { data: products } = useProducts();
  const { data: salesmen } = useSalesmen();

  const nextNo = useQuery({
    queryKey: ['next-invoice'],
    queryFn: async () => (await api.get('/sales/next-no')).data.invoiceNo as number,
  });

  const productMap = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );
  const account = useMemo<Account | undefined>(
    () => (accounts ?? []).find((a) => a.id === accountId),
    [accounts, accountId],
  );
  const salesman = useMemo(
    () => (salesmen ?? []).find((s) => s.id === salesmanId),
    [salesmen, salesmanId],
  );

  const preBalance = account?.balance ?? 0;

  const linePaisa = (l: Line): number => {
    const p = l.productId ? productMap.get(l.productId) : undefined;
    return computeLineTotalPaisa({
      ctn: l.ctn,
      box: l.box,
      ratePaisa: toPaisa(l.rate),
      cartonSize: p?.cartonSize ?? 1,
      discPct: l.discPct,
      discRsPaisa: toPaisa(l.discRs),
    });
  };

  const grossTotal = lines.reduce((s, l) => s + linePaisa(l), 0);
  const invoiceTotal = Math.max(
    0,
    grossTotal - toPaisa(discountRs) - Math.round((grossTotal * discountPct) / 100),
  );
  const netTotal = invoiceTotal + preBalance;

  const updateLine = (key: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const onSelectProduct = (key: string, productId: number) => {
    const p = productMap.get(productId);
    updateLine(key, { productId, rate: p ? toRupees(p.salePrice) : 0 });
  };

  const onSelectAccount = (id: number) => {
    setAccountId(id);
    const acc = (accounts ?? []).find((a) => a.id === id);
    if (acc?.salesmanId) setSalesmanId(acc.salesmanId);
  };

  const addLine = () => setLines((p) => [...p, emptyLine()]);
  const removeLine = (key: string) =>
    setLines((p) => (p.length > 1 ? p.filter((l) => l.key !== key) : p));

  const reset = () => {
    setLines([emptyLine()]);
    setAccountId(null);
    setSalesmanId(null);
    setDiscountPct(0);
    setDiscountRs(0);
    setDescript('SALE');
    setClaimable(false);
    setPaymentMode('CREDIT');
    nextNo.refetch();
  };

  const buildPayload = () => ({
    date: date.format('YYYY-MM-DD'),
    accountId,
    salesmanId,
    paymentMode,
    discountPct,
    discountRs: toPaisa(discountRs),
    descript,
    claimable,
    items: lines
      .filter((l) => l.productId && (l.ctn || l.box || l.freeQty))
      .map((l) => ({
        productId: l.productId,
        sch: l.sch,
        schemeFree: l.schemeFree,
        ctn: l.ctn,
        box: l.box,
        safi: l.safi,
        freeQty: l.freeQty,
        rate: toPaisa(l.rate),
        discPct: l.discPct,
        discRs: toPaisa(l.discRs),
      })),
  });

  const doSave = async (afterPrint: boolean) => {
    if (!accountId) {
      message.warning('Select an account first');
      return;
    }
    const payload = buildPayload();
    if (payload.items.length === 0) {
      message.warning('Add at least one product with quantity');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/sales', payload);
      const warnings: string[] = data.warnings ?? [];
      if (warnings.length) {
        Modal.warning({
          title: 'Saved with warnings',
          icon: <WarningFilled style={{ color: '#faad14' }} />,
          content: (
            <div>
              {warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ),
        });
      } else {
        message.success(`Invoice #${data.invoice.invoiceNo} saved`);
      }
      if (afterPrint) {
        await loadAndPrint(data.invoice.id);
      }
      reset();
    } catch (err) {
      message.error(apiError(err, 'Failed to save invoice'));
    } finally {
      setSaving(false);
    }
  };

  const loadAndPrint = async (id: number) => {
    const { data } = await api.get(`/sales/${id}`);
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'productId',
      width: 240,
      render: (_: unknown, r: Line) => (
        <Select
          showSearch
          placeholder="Select product"
          style={{ width: '100%' }}
          value={r.productId ?? undefined}
          optionFilterProp="label"
          onChange={(v) => onSelectProduct(r.key, v)}
          options={(products ?? []).map((p: Product) => ({
            value: p.id,
            label: `${p.name} (${p.code})`,
          }))}
        />
      ),
    },
    qtyCol('Sch', 'sch'),
    qtyCol('Sch Free', 'schemeFree'),
    qtyCol('Ctn', 'ctn'),
    qtyCol('Box', 'box'),
    qtyCol('Safi', 'safi'),
    qtyCol('Free', 'freeQty'),
    {
      title: 'Rate',
      dataIndex: 'rate',
      width: 100,
      render: (_: unknown, r: Line) => (
        <InputNumber
          min={0}
          value={r.rate}
          style={{ width: '100%' }}
          onChange={(v) => updateLine(r.key, { rate: Number(v ?? 0) })}
        />
      ),
    },
    {
      title: 'Disc %',
      dataIndex: 'discPct',
      width: 80,
      render: (_: unknown, r: Line) => (
        <InputNumber
          min={0}
          max={100}
          value={r.discPct}
          style={{ width: '100%' }}
          onChange={(v) => updateLine(r.key, { discPct: Number(v ?? 0) })}
        />
      ),
    },
    {
      title: 'Disc Rs',
      dataIndex: 'discRs',
      width: 90,
      render: (_: unknown, r: Line) => (
        <InputNumber
          min={0}
          value={r.discRs}
          style={{ width: '100%' }}
          onChange={(v) => updateLine(r.key, { discRs: Number(v ?? 0) })}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      width: 110,
      align: 'right' as const,
      render: (_: unknown, r: Line) => (
        <Text strong>{formatPaisa(linePaisa(r))}</Text>
      ),
    },
    {
      title: '',
      width: 44,
      render: (_: unknown, r: Line) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeLine(r.key)}
        />
      ),
    },
  ];

  function qtyCol(title: string, key: keyof Line) {
    return {
      title,
      dataIndex: key,
      width: 70,
      render: (_: unknown, r: Line) => (
        <InputNumber
          min={0}
          value={r[key] as number}
          style={{ width: '100%' }}
          onChange={(v) => updateLine(r.key, { [key]: Number(v ?? 0) } as Partial<Line>)}
        />
      ),
    };
  }

  return (
    <div>
      <div className="no-print">
        <Title level={4} style={{ marginTop: 0 }}>
          New Sale
        </Title>

        <Card size="small" style={{ marginBottom: 12 }}>
          <Row gutter={12}>
            <Col span={4}>
              <Text type="secondary">Date</Text>
              <DatePicker
                value={date}
                onChange={(d) => d && setDate(d)}
                allowClear={false}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>
            <Col span={3}>
              <Text type="secondary">Invoice #</Text>
              <Input value={nextNo.data ?? '...'} disabled />
            </Col>
            <Col span={5}>
              <Text type="secondary">Salesman</Text>
              <Select
                showSearch
                placeholder="Salesman"
                style={{ width: '100%' }}
                value={salesmanId ?? undefined}
                optionFilterProp="label"
                onChange={setSalesmanId}
                options={(salesmen ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
            </Col>
            <Col span={7}>
              <Text type="secondary">Account (Shop)</Text>
              <Select
                showSearch
                placeholder="Search by name or code"
                style={{ width: '100%' }}
                value={accountId ?? undefined}
                optionFilterProp="label"
                onChange={onSelectAccount}
                options={(accounts ?? [])
                  .filter((a) => a.type === 'customer' || a.type === 'cash')
                  .map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              />
            </Col>
            <Col span={5}>
              <Text type="secondary">Address</Text>
              <Input value={account?.address ?? ''} disabled />
            </Col>
          </Row>
          <Row gutter={12} style={{ marginTop: 8 }}>
            <Col span={6}>
              <Text type="secondary">SM Limit: </Text>
              <Text>{salesman ? formatPKR(salesman.creditLimit) : '-'}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">SM Outstanding: </Text>
              <Text>{salesman ? formatPKR(salesman.outstanding ?? 0) : '-'}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">Shop Limit: </Text>
              <Text>{account ? formatPKR(account.shopLimit) : '-'}</Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">Pre Balance: </Text>
              <Text strong>{formatPKR(preBalance)}</Text>
            </Col>
          </Row>
        </Card>

        <Card
          size="small"
          style={{ marginBottom: 12 }}
          title="Products"
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={addLine}>
              Add Row
            </Button>
          }
        >
          <Table
            rowKey="key"
            size="small"
            dataSource={lines}
            columns={columns}
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </Card>

        <Row gutter={12}>
          <Col span={10}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Description</Text>
                  <Input value={descript} onChange={(e) => setDescript(e.target.value)} />
                </div>
                <Space>
                  <div>
                    <Text type="secondary">Payment Mode</Text>
                    <div>
                      <Radio.Group
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        options={[
                          { label: 'Credit', value: 'CREDIT' },
                          { label: 'Cash', value: 'CASH' },
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <Text type="secondary">Claimable</Text>
                    <div>
                      <Switch checked={claimable} onChange={setClaimable} />
                    </div>
                  </div>
                </Space>
              </Space>
            </Card>
          </Col>
          <Col span={14}>
            <Card size="small">
              <Row gutter={12} align="middle">
                <Col span={6}>
                  <Text type="secondary">Disc %</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={discountPct}
                    style={{ width: '100%' }}
                    onChange={(v) => setDiscountPct(Number(v ?? 0))}
                  />
                </Col>
                <Col span={6}>
                  <Text type="secondary">Disc Rs</Text>
                  <InputNumber
                    min={0}
                    value={discountRs}
                    style={{ width: '100%' }}
                    onChange={(v) => setDiscountRs(Number(v ?? 0))}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Invoice Total"
                    value={formatPaisa(invoiceTotal)}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Net Balance"
                    value={formatPaisa(netTotal)}
                    valueStyle={{ fontSize: 18, color: '#1565c0' }}
                  />
                </Col>
              </Row>
              <Space style={{ marginTop: 12 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={() => doSave(false)}
                >
                  Save
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  loading={saving}
                  onClick={() => doSave(true)}
                >
                  Save &amp; Print
                </Button>
                <Button onClick={reset}>New / Clear</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>

      {printData && (
        <div className="print-area" ref={printRef}>
          <InvoicePrint
            invoice={printData.invoice}
            items={printData.items}
            account={printData.account}
            salesmanName={salesman?.name}
          />
        </div>
      )}
    </div>
  );
}
