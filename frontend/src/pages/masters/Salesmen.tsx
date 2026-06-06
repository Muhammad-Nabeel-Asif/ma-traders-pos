import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Typography,
  Popconfirm,
  Progress,
  App as AntApp,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { useSalesmen } from '../../lib/queries';
import { formatPKR, toPaisa, toRupees } from '../../lib/money';
import type { Salesman } from '../../lib/types';

const { Title } = Typography;

export default function Salesmen() {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useSalesmen(search);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Salesman | null>(null);
  const [form] = Form.useForm();

  const save = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        name: values.name,
        phone: values.phone ?? '',
        creditLimit: toPaisa(values.creditLimit ?? 0),
        active: values.active ?? true,
      };
      if (editing) return api.put(`/salesmen/${editing.id}`, payload);
      return api.post('/salesmen', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      message.success('Saved');
      setOpen(false);
    },
    onError: (e) => message.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/salesmen/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['salesmen'] });
      message.success('Deleted');
    },
    onError: (e) => message.error(apiError(e)),
  });

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ active: true });
    setOpen(true);
  };
  const openEdit = (s: Salesman) => {
    setEditing(s);
    form.setFieldsValue({ ...s, creditLimit: toRupees(s.creditLimit) });
    setOpen(true);
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          Salesmen
        </Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="Search salesmen"
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch('')}
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
            New Salesman
          </Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        dataSource={data}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Phone', dataIndex: 'phone', width: 150 },
          {
            title: 'Credit Limit',
            dataIndex: 'creditLimit',
            width: 150,
            align: 'right',
            render: (v: number) => formatPKR(v),
          },
          {
            title: 'Outstanding',
            dataIndex: 'outstanding',
            width: 150,
            align: 'right',
            render: (v: number) => formatPKR(v ?? 0),
          },
          {
            title: 'Limit Used',
            width: 160,
            render: (_, r: Salesman) => {
              if (!r.creditLimit) return '-';
              const pct = Math.min(
                100,
                Math.round(((r.outstanding ?? 0) / r.creditLimit) * 100),
              );
              return (
                <Progress
                  percent={pct}
                  size="small"
                  status={pct >= 100 ? 'exception' : 'normal'}
                />
              );
            },
          },
          {
            title: 'Actions',
            width: 110,
            render: (_, r: Salesman) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm title="Delete this salesman?" onConfirm={() => remove.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit Salesman' : 'New Salesman'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={save.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="creditLimit" label="Credit Limit (PKR)">
            <InputNumber min={0} style={{ width: '100%' }} step={1000} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
