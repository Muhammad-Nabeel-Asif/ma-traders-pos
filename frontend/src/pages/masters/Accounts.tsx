import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  Popconfirm,
  Tag,
  App as AntApp,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useAccounts, useSalesmen, useTowns } from '../../lib/queries';
import { formatPKR, toPaisa, toRupees } from '../../lib/money';
import type { Account } from '../../lib/types';

const { Title } = Typography;

const TYPES = [
  { value: 'customer', label: 'Customer (Shop)' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'cash', label: 'Cash' },
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'other', label: 'Other' },
];

export default function Accounts() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAccounts({ q: search });
  const { data: towns } = useTowns();
  const { data: salesmen } = useSalesmen();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        code: values.code,
        name: values.name,
        type: values.type ?? 'customer',
        address: values.address ?? '',
        phone: values.phone ?? '',
        townId: values.townId ?? null,
        salesmanId: values.salesmanId ?? null,
        shopLimit: toPaisa(values.shopLimit ?? 0),
        openingBalance: toPaisa(values.openingBalance ?? 0),
        active: values.active ?? true,
      };
      if (editing) return api.put(`/accounts/${editing.id}`, payload);
      return api.post('/accounts', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Saved');
      setOpen(false);
    },
    onError: (e) => message.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      message.success('Deleted');
    },
    onError: (e) => message.error(apiError(e)),
  });

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true, type: 'customer' });
    setOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    form.setFieldsValue({
      ...a,
      shopLimit: toRupees(a.shopLimit),
      openingBalance: toRupees(a.openingBalance),
    });
    setOpen(true);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Accounts
        </Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Search accounts"
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            New Account
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={data}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Code', dataIndex: 'code', width: 100 },
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Type',
            dataIndex: 'type',
            width: 110,
            render: (t: string) => <Tag>{t}</Tag>,
          },
          { title: 'Address', dataIndex: 'address' },
          {
            title: 'Shop Limit',
            dataIndex: 'shopLimit',
            width: 130,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Balance',
            dataIndex: 'balance',
            width: 140,
            align: 'right',
            render: (v: number) => (
              <span style={{ color: v > 0 ? '#cf1322' : '#389e0d' }}>
                {formatPKR(v ?? 0)}
              </span>
            ),
          },
          {
            title: 'Actions',
            width: 110,
            render: (_, r: Account) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm title="Delete this account?" onConfirm={() => remove.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit Account' : 'New Account'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        width={620}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="code" label="Code" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input autoFocus />
            </Form.Item>
            <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input />
            </Form.Item>
            <Form.Item name="type" label="Type" style={{ width: 160 }}>
              <Select options={TYPES} />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="phone" label="Phone" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="townId" label="Town" style={{ flex: 1 }}>
              <Select
                allowClear
                options={(towns ?? []).map((t) => ({ value: t.id, label: t.name }))}
              />
            </Form.Item>
            <Form.Item name="salesmanId" label="Salesman" style={{ flex: 1 }}>
              <Select
                allowClear
                options={(salesmen ?? []).map((s) => ({ value: s.id, label: s.name }))}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="shopLimit" label="Shop Credit Limit (PKR)" style={{ flex: 1 }}>
              <InputNumber min={0} step={1000} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="openingBalance"
              label="Opening Balance (PKR)"
              style={{ flex: 1 }}
              tooltip="Positive = customer owes us"
            >
              <InputNumber step={100} style={{ width: '100%' }} disabled={!!editing} />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}
